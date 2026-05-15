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
 *
 * The critical distinction for 404 handling:
 *   - 'done' reached via analysisJobId completing → 404 means "DB mid-write", retry
 *   - 'done' reached on fresh page load with no job → 404 means "never generated", return null
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
  // True only when 'done' was reached by a completing analysis job (not a fresh page load).
  // Tells the query: a 404 here means "DB mid-write", not "never generated".
  const [justFinishedAnalysis, setJustFinishedAnalysis] = useState(false)

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
    isError: isScorecardError,
    error: scorecardError,
  } = useQuery({
    queryKey: ['scorecard'],
    queryFn: getMyScorecard,
    // Never fire while analysis is running or before sessionStorage is hydrated
    enabled: scorecardState === 'done',
    staleTime: 0,
    // Only retry 404s when we know the analysis job just finished (DB mid-write).
    // On a fresh page load with no job, a 404 simply means "never generated" — don't retry.
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return justFinishedAnalysis && failureCount < 10
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
    setJustFinishedAnalysis(true)   // next 404 = DB mid-write, not "never generated"
    setScorecardState('done')
    queryClient.invalidateQueries({ queryKey: ['analysisCooldown'] })
  }, [queryClient])

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  // Still resolving sessionStorage on the client — render nothing until we know
  // whether an analysis job exists. Showing a skeleton here would be misleading
  // because there may be no scorecard at all.
  if (scorecardState === 'idle') {
    return null
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

  // Scorecard has never been generated (404 on a fresh page load with no job).
  // Return null so GenerateScorecardSection renders the CTA instead.
  const isNeverGenerated =
    isScorecardError && (scorecardError as any)?.status === 404 && !justFinishedAnalysis
  if (isNeverGenerated) {
    return null
  }

  // Waiting for the scorecard fetch to complete (post-analysis retries only).
  // On a fresh page load with no job, an absence of data means "never generated" —
  // return null so GenerateScorecardSection renders the CTA instead.
  if (isScorecardLoading || !scorecardData) {
    return justFinishedAnalysis ? <LoadingSkeleton /> : null
  }

  // Normalize once
  const normalized = normalizeScorecard(scorecardData)

  // Guard: don't render until the scorecard is structurally populated.
  // If the DB returned a partial record, React Query will retry until it's ready.
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
