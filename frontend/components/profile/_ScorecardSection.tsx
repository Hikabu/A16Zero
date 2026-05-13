'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { startAnalysis, getMyScorecard, getMyRawScorecard } from '@/lib/api'
import { ScorecardView, ScorecardData } from '@/components/ScorecardView'
import { AnalysisPoller } from '@/components/AnalysisPoller'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { normalizeScorecard } from '@/lib/scorecard/normalizeScorecard'
import { LoadingSkeleton } from '../LoadingSkeleton'

export function ScorecardSection() {
  const queryClient = useQueryClient()
  // const [scorecardState, setScorecardState] = useState<'empty'|'loading'|'done'>('empty')
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(
    () => typeof window !== 'undefined' ? sessionStorage.getItem('analysis_job_id') : null
  )
  const [isRawDataOpen, setIsRawDataOpen] = useState(false)
const [bootstrapped, setBootstrapped] = useState(false)
useEffect(() => {
  setBootstrapped(true)
}, [])
  // ON MOUNT: getMyScorecard

  const shouldFetchScorecard =
  bootstrapped &&
  scorecardState === 'done' &&
  !analysisJobId
  
  const { data: scorecardData, isLoading: isScorecardLoading, isError: isScorecardError } = useQuery({
    queryKey: ['scorecard'],
    queryFn: getMyScorecard,
  //   enabled: bootstrapped,
  // staleTime: 0, 

  //  retry: true,
  // retryDelay: 1000,
  refetchInterval: (q) => {LoadingSkeleton
    // keep polling only during "not ready"
    if (q.state.error?.status === 404) return 1000
    return false
  },
  })

  // RAW DATA: Lazy load
  const { data: rawData, isLoading: isRawLoading } = useQuery({
    queryKey: ['scorecard', 'raw'],
    queryFn: getMyRawScorecard,
    // enabled: isRawDataOpen && scorecardState === 'done',
    staleTime: Infinity,
  })


  // GENERATE MUTATION (Used for Regenerate inside ScorecardView)
  const generateMut = useMutation({
    mutationFn: startAnalysis,
    onSuccess: (data: any) => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('analysis_job_id', data.jobId)
      }
      setAnalysisJobId(data.jobId)
      // setScorecardState('loading')
      queryClient.invalidateQueries({ queryKey: ['analysisCooldown'] })
    }
  })

console.log("🔁 STATE EFFECT RUN", {
    analysisJobId,
    isScorecardLoading,
    hasData: !!scorecardData,
  })

  // State machine logic for mounting and data fetchinguseEffect(() => {
useEffect(() => {
  if (!bootstrapped) return

  // if (analysisJobId) {
  //   setScorecardState('loading')
  //   return
  // }

  if (isScorecardLoading) return

  // if (scorecardData) {
  //   setScorecardState('done')
  // } else {
  //   setScorecardState('empty')
  // }
}, [bootstrapped, analysisJobId, scorecardData, isScorecardLoading])

  // Optional: Global listener to allow GenerateScorecardSection (sibling in page.tsx) to trigger analysis
  useEffect(() => {
    const handleStartAnalysis = (e: CustomEvent) => {
      const jobId = e.detail?.jobId
      if (jobId) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('analysis_job_id', jobId)
        }
        // setAnalysisJobId(jobId)
        setScorecardState('loading')
      }
    }
    window.addEventListener('startAnalysis', handleStartAnalysis as EventListener)
    return () => {
      window.removeEventListener('startAnalysis', handleStartAnalysis as EventListener)
    }
  }, [])

  // if (scorecardState === 'empty' && bootstrapped) {
  //   // CTA defers to GenerateScorecardSection above
  //   return null 
  // }

  console.log("SCORECARD DATA: ", scorecardData);
  
  if (!bootstrapped || !scorecardData || ) {
  return <LoadingSkeleton />
}

  if (scorecardState === 'loading' && analysisJobId) {
    return (
      <AnalysisPoller 
        jobId={analysisJobId} 
        onComplete={() => {
          setAnalysisJobId(null)
          setScorecardState('done')
queryClient.invalidateQueries({ queryKey: ['analysisCooldown'] })
}} 
      />
    )
  }

  if (scorecardState === 'done' && scorecardData) {
    const normalized = normalizeScorecard(scorecardData)

    return (
      <div className="space-y-6">
        <ScorecardView 
        scorecard={normalized}
          // scorecard={scorecardData as unknown as ScorecardData} 
          isPublic={false}
          onRegenerate={() => generateMut.mutate()}
        />
      </div>
    )
  }

  // Fallback loading state before the state machine fully resolves
  return <div className="h-20 flex items-center justify-center text-sm text-muted-foreground animate-pulse">Loading scorecard state...</div>
}
