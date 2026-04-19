## Stage 2 Refactor — Deliverable Checklist

### Phase 1 — Preparation
- [x] AnalysisResult TypeScript interface locked in result.types.ts
- [x] ExtractedSignals TypeScript interface defined
- [x] ProgressStage type defined; stage order corrected (analyzing_projects before building_profile)
- [x] Legacy scoring code removed (not just feature-flagged — deleted)
- [x] Old Prisma models removed (pillar scores, behavior patterns, old signal fields)
- [x] npx tsc --noEmit passes with zero errors

### Phase 2 — Signal Extraction
- [x] SignalExtractorService.extract() returns all 8 signals
- [x] S1 ownership depth: non-fork, maintained > 3 months, created > 3 months
- [x] S2 project longevity: average age in months of qualifying repos
- [x] S3 activity consistency: activeWeeks / 52, trend analysis available via getTrend()
- [x] S4 stack breadth: unique language count across all non-fork repos
- [x] S5 external contributions: mergedExternalPRCount pass-through
- [x] S6 project meaningfulness: normalised composite of stars + forks + topics presence
- [x] S7 stack identity: top 2 languages by repo count
- [x] S8 data completeness: weighted factor from repo count + account age + graph visibility
- [x] detectPrivateWorkIndicators: s3 > 0.5 AND s8 < 0.4

### Phase 3 — Scoring Layer
- [x] ScoringService.computeCapabilities(): language weight map applied; breadth bonus applied; 0–100 integer scores
- [x] ScoringService.computeOwnership(): count-based, not scored; activelyMaintained from 6-month window
- [x] ScoringService.computeImpact(): qualitative descriptors; consistency from trend
- [x] Confidence applied inline to each dimension; not as standalone field
- [x] privateWorkNote included when indicators detected; absent otherwise
- [x] SummaryGeneratorService: rule-based, deterministic, 1–2 sentences

### Phase 4 — Cache Layer
- [x] CacheService.get(): Redis → PostgreSQL fallback
- [x] CacheService.set(): writes to both Redis and PostgreSQL
- [x] CacheService.invalidate(): clears both layers
- [x] 24h TTL enforced on both layers
- [x] Cache key normalised to lowercase username
- [x] POST /analysis/recompute: X-Internal-Key guard; force=true clears cache
- [x] Seed preload script: 5 demo usernames preloaded

### Phase 5 — Data Fetcher
- [x] Commit-level API calls removed
- [x] Diff and line-count fetch removed
- [x] All required fields confirmed present: language, stars, forks, topics, created_at, pushed_at, fork
- [x] GitHubRawData typed interface defined
- [x] Rate limit retry: 429 triggers one retry with 2s delay
- [x] Raw data stored in GithubProfile.rawDataSnapshot

### Phase 6 — Validation
- [x] All 8 verification plan tests pass
- [x] All 5 seed fixtures produce correct signal + score output
- [x] Coverage ≥ 80% on src/scoring/
- [x] npx tsc --noEmit: zero errors
- [x] npx prisma validate: clean
- [x] Full e2e test suite: 8 tests pass
- [x] Pipeline time (CPU-bound parts): < 2s
- [x] GET /analysis/:jobId/result: returns correct shape for all status values
