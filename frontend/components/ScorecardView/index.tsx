'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Code2,
  Wallet,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CapabilityScore {
  /** Human-readable label, e.g. "Code Quality" */
  label: string
  /** 0–100 */
  score: number
}

export interface Web3Achievement {
  label: string
  description?: string
}

export interface ScorecardData {
  /** 0–100 composite score */
  overallScore: number
  /** AI-generated summary paragraph */
  summary: string
  /** Per-category breakdown */
  capabilities: CapabilityScore[]
  /** Technology / language chips */
  stackFingerprint: string[]
  /** On-chain achievements – may be absent (wallet not linked) */
  web3?: {
    achievements?: Web3Achievement[]
  } | null
  /** Arbitrary raw payload for debugging */
  raw?: unknown
  /** ISO timestamp of last analysis */
  generatedAt?: string
}

export interface ScorecardViewProps {
  scorecard: ScorecardData
  /** When true: hides raw toggle, hides regenerate button */
  isPublic?: boolean
  onRegenerate?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBgRing(score: number): string {
  if (score >= 80) return 'ring-emerald-500/30 bg-emerald-500/5'
  if (score >= 60) return 'ring-amber-500/30 bg-amber-500/5'
  return 'ring-red-500/30 bg-red-500/5'
}

function capabilityBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

/** How many characters of summary to show before "Show more" */
const SUMMARY_TRUNCATE = 220

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Section heading used across the card */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

/** Animated capability bar row */
function CapabilityBar({
  label,
  score,
  delay,
}: {
  label: string
  score: number
  delay: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/80">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${scoreColor(score)}`}>
          {score}
        </span>
      </div>
      {/* Track */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`absolute left-0 top-0 h-full rounded-full ${capabilityBarColor(score)}`}
          initial={{ width: '0%' }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1], delay }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ScorecardView({
  scorecard,
  isPublic = false,
  onRegenerate,
}: ScorecardViewProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)

  const {
    overallScore,
    summary,
    capabilities,
    stackFingerprint,
    web3,
    raw,
    generatedAt,
  } = scorecard

  const summaryIsTruncatable = summary.length > SUMMARY_TRUNCATE
  const displayedSummary =
    summaryExpanded || !summaryIsTruncatable
      ? summary
      : `${summary.slice(0, SUMMARY_TRUNCATE).trimEnd()}…`

  const achievements = web3?.achievements ?? []

  return (
    <Card className="w-full overflow-hidden rounded-xl">
      {/* ── Score Badge header ───────────────────────────────── */}
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-start justify-between gap-4">
          {/* Score pill */}
          <div
            className={`inline-flex flex-col items-center rounded-2xl px-6 py-3 ring-1 ${scoreBgRing(overallScore)}`}
          >
            <span
              className={`text-5xl font-bold tabular-nums leading-none ${scoreColor(overallScore)}`}
            >
              {overallScore}
            </span>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Overall Score
            </span>
          </div>

          {/* Metadata */}
          <div className="flex flex-col items-end gap-1 pt-1">
            {generatedAt && (
              <span className="text-xs text-muted-foreground">
                Generated{' '}
                {new Date(generatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 pt-5">

        {/* ── 1. Summary ────────────────────────────────────── */}
        <section>
          <SectionLabel>Summary</SectionLabel>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {displayedSummary}
          </p>
          {summaryIsTruncatable && (
            <button
              onClick={() => setSummaryExpanded((v) => !v)}
              className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              {summaryExpanded ? (
                <>
                  Show less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </section>

        <Separator className="opacity-50" />

        {/* ── 2. Capability Bars ────────────────────────────── */}
        {capabilities.length > 0 && (
          <section>
            <SectionLabel>Capabilities</SectionLabel>
            <div className="flex flex-col gap-3.5">
              {capabilities.map((cap, i) => (
                <CapabilityBar
                  key={cap.label}
                  label={cap.label}
                  score={cap.score}
                  delay={i * 0.05}
                />
              ))}
            </div>
          </section>
        )}

        {capabilities.length > 0 && <Separator className="opacity-50" />}

        {/* ── 3. Stack Fingerprint ──────────────────────────── */}
        {stackFingerprint.length > 0 && (
          <section>
            <SectionLabel>
              <span className="inline-flex items-center gap-1.5">
                <Code2 className="h-3 w-3" />
                Stack Fingerprint
              </span>
            </SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {stackFingerprint.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>
        )}

        {stackFingerprint.length > 0 && <Separator className="opacity-50" />}

        {/* ── 4. Web3 Achievements ──────────────────────────── */}
        <section>
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="h-3 w-3" />
              Web3 Activity
            </span>
          </SectionLabel>

          {achievements.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">
              {web3 == null
                ? 'No wallet linked — connect a Solana wallet to surface on-chain activity.'
                : 'No on-chain achievements found for this wallet.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {achievements.map((ach, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {ach.label}
                    </p>
                    {ach.description && (
                      <p className="text-xs text-muted-foreground">
                        {ach.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── 5. Raw Data Toggle (owner-only) ───────────────── */}
        {!isPublic && raw !== undefined && (
          <>
            <Separator className="opacity-50" />
            <Collapsible open={rawOpen} onOpenChange={setRawOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex w-full cursor-pointer items-center justify-between text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <span>Raw analysis data</span>
                  {rawOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground ring-1 ring-border/40">
                  {JSON.stringify(raw, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* ── 6. Regenerate (owner-only) ────────────────────── */}
        {!isPublic && onRegenerate && (
          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              className="cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Regenerate scorecard
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

export default ScorecardView
