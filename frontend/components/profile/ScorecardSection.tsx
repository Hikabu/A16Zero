'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { startAnalysis, getMyScorecard, getMyRawScorecard } from '@/lib/api'
import { ScorecardView, ScorecardData } from '@/components/ScorecardView'
import { AnalysisPoller } from '@/components/AnalysisPoller'
import { normalizeScorecard } from '@/lib/scorecard/normalizeScorecard'
import { LoadingSkeleton } from '../LoadingSkeleton'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * 'idle'      – not yet hydrated from sessionStorage (SSR guard)
 * 'analyzing' – an analysis job is running; scorecard fetch is suppressed
 * 'done'      – analysis finished (or none in progress); scorecard fetch is active
 */
type ScorecardState = 'idle' | 'analyzing' | 'done'

// ---------------------------------------------------------------------------
// Guard: is the normalized scorecard actually populated?
//
// We cannot rely on zero-values because legitimate scores can be 0.
// Instead we check that the object exists and has the shape we expect.
// Adjust the field checks here if normalizeScorecard's output shape changes.
// ---------------------------------------------------------------------------
function isScorecardReady(normalized: ReturnType<typeof normalizeScorecard> | null | undefined): boolean {
  if (!normalized) return false
  // The scorecard must exist as an object with at least one own key.
  // Add deeper structural checks here as the schema evolves.
  return typeof normalized === 'object' && Object.keys(normalized).length > 0
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScorecardSection() {
  const queryClient = useQueryClient()

  // ------------------------------------------------------------------
  // Phase 1 – resolve initial state synchronously from sessionStorage.
  // We start 'idle' (SSR-safe), then immediately upgrade on the client.
  // ------------------------------------------------------------------
  const [scorecardState, setScorecardState] = useState<ScorecardState>('idle')
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null)

  useEffect(() => {
    const storedJobId = typeof window !== 'undefined'
      ? sessionStorage.getItem('analysis_job_id')
      : null

    if (storedJobId) {
      setAnalysisJobId(storedJobId)
      setScorecardState('analyzing')
    } else {
      setScorecardState('done')
    }
  }, []) // runs once, on mount

  // ------------------------------------------------------------------
  // Phase 2 – fetch scorecard ONLY when we are in the 'done' state.
  // This prevents racing against an in-progress DB write from the job.
  // ------------------------------------------------------------------
  const {
    data: scorecardData,
    isLoading: isScorecardLoading,
  } = useQuery({
    queryKey: ['scorecard'],
    queryFn: getMyScorecard,
    // KEY FIX: never fire while analysis is running or before we've hydrated
    enabled: scorecardState === 'done',
    // Don't treat a stale cache hit as fresh – always revalidate when enabled
    staleTime: 0,
    // If the API returns 404 (record not written yet) keep retrying
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return failureCount < 10
      return failureCount < 3
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  })

  // ------------------------------------------------------------------
  // Raw data – lazy, only when scorecard is fully rendered
  // ------------------------------------------------------------------
  const { data: rawData, isLoading: isRawLoading } = useQuery({
    queryKey: ['scorecard', 'raw'],
    queryFn: getMyRawScorecard,
    enabled: scorecardState === 'done' && isScorecardReady(scorecardData ? normalizeScorecard(scorecardData) : null),
    staleTime: Infinity,
  })

  // ------------------------------------------------------------------
  // Mutation – regenerate (Regenerate button inside ScorecardView)
  // ------------------------------------------------------------------
  const generateMut = useMutation({
    mutationFn: startAnalysis,
    onSuccess: (data: any) => {
      const jobId: string = data.jobId
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('analysis_job_id', jobId)
      }
      setAnalysisJobId(jobId)
      setScorecardState('analyzing')
      // Invalidate the cached scorecard so we get a fresh one after analysis
      queryClient.removeQueries({ queryKey: ['scorecard'] })
      queryClient.invalidateQueries({ queryKey: ['analysisCooldown'] })
    },
  })

  // ------------------------------------------------------------------
  // Global event – sibling component (GenerateScorecardSection) signals
  // that a new analysis job has started.
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleStartAnalysis = (e: CustomEvent) => {
      const jobId: string | undefined = e.detail?.jobId
      if (!jobId) return
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('analysis_job_id', jobId)
      }
      setAnalysisJobId(jobId)
      setScorecardState('analyzing')
      // Evict stale scorecard so the post-analysis fetch is always fresh
      queryClient.removeQueries({ queryKey: ['scorecard'] })
    }

    window.addEventListener('startAnalysis', handleStartAnalysis as EventListener)
    return () => window.removeEventListener('startAnalysis', handleStartAnalysis as EventListener)
  }, [queryClient])

  // ------------------------------------------------------------------
  // AnalysisPoller completion handler – stable reference via useCallback
  // ------------------------------------------------------------------
  const handleAnalysisComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('analysis_job_id')
    }
    setAnalysisJobId(null)
    // Transition to 'done' FIRST → this enables the query → fetch runs
    // after the DB write is guaranteed complete (job finished = written).
    setScorecardState('done')
    queryClient.invalidateQueries({ queryKey: ['analysisCooldown'] })
  }, [queryClient])

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  // Still resolving sessionStorage on the client
  if (scorecardState === 'idle') {
    return <LoadingSkeleton />
  }

  // Analysis in progress – show the poller, not a broken scorecard
  if (scorecardState === 'analyzing' && analysisJobId) {
    return (
      <AnalysisPoller
        jobId={analysisJobId}
        onComplete={handleAnalysisComplete}
      />
    )
  }

  // Waiting for the scorecard fetch to complete
  if (isScorecardLoading || !scorecardData) {
    return <LoadingSkeleton />
  }

  // Normalize once
  const normalized = normalizeScorecard(scorecardData)

  // Guard: don't render until the scorecard is structurally populated.
  // This is the race-condition safety net: if the DB returns an empty/
  // partial record React Query will retry (see retryDelay above) until
  // the record is fully written.
  if (!isScorecardReady(normalized)) {
    return <LoadingSkeleton />
  }

  // Happy path – fully populated scorecard
  return (
    <div className="space-y-6">
      <ScorecardView
        scorecard={normalized}
        isPublic={false}
        onRegenerate={() => generateMut.mutate()}
      />
    </div>
  )
}
