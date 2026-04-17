# COLOSSEUM

## Table of Contents

- [0. Core Thesis](#0-core-thesis)
- [1. Tech Stack](#1-tech-stack)
- [2. Project Structure](#2-project-structure)
- [3. Architecture](#3-architecture)
  - [3.1 Architecture Decision Records](#31-architecture-decision-records)
  - [3.2 System Architecture Pipeline](#32-system-architecture-pipeline)
- [4. Features](#4-features)
  - [4.1 Low-Signal Firewall](#41-low-signal-firewall)
  - [4.2 Signal Engine — 34 Scored Signals](#42-signal-engine--34-scored-signals)
  - [4.3 ConfidenceEnvelope → Risk Level Mapping](#43-confidenceenvelope--risk-level-mapping)
  - [4.4 BehaviorClassifier Patterns](#44-behaviorclassifier-patterns)
  - [4.5 Temporal Scoring](#45-temporal-scoring)
  - [4.6 Role-Fit Weight Matrix](#46-role-fit-weight-matrix)
  - [4.7 Gap Analysis Engine](#47-gap-analysis-engine)
  - [4.8 Fraud Signal Handling](#48-fraud-signal-handling)
  - [4.9 CV Replacement Layer — Three Mandatory Output Objects](#49-cv-replacement-layer--three-mandatory-output-objects)
- [5. Scoring Pipeline Detail](#5-scoring-pipeline-detail)
  - [5.1 DataCompletenessEngine](#51-datacompletenessengine)
  - [5.2 Ecosystem Normaliser — 25+ Cohorts](#52-ecosystem-normaliser--25-cohorts)
  - [5.3 Minimum Sample Thresholds](#53-minimum-sample-thresholds)
  - [5.4 Web3 Layer](#54-web3-layer)
  - [5.5 Web3 Signal Engine — 25 Signals across 4 Sub-Pillars](#55-web3-signal-engine--25-signals-across-4-sub-pillars)
  - [5.6 Web3 Role-Fit Weight Distribution](#56-web3-role-fit-weight-distribution)
  - [5.7 Stealth Senior Detection](#57-stealth-senior-detection)
- [6. Job Description Parsing & Gap Analysis](#6-job-description-parsing--gap-analysis)
  - [6.1 JobDescriptionParser](#61-jobdescriptionparser)
  - [6.2 Technology Matching](#62-technology-matching)
  - [6.3 STAR-Format Interview Probe Library](#63-star-format-interview-probe-library)
  - [6.4 Web3 Technical Vetting Probes](#64-web3-technical-vetting-probes)
  - [6.5 Interviewer Brief PDF](#65-interviewer-brief-pdf)
  - [X. Unknowns / Not Observable — First-Class Output](#x-unknowns--not-observable--first-class-output)
- [7. BullMQ Queue Pipeline](#7-bullmq-queue-pipeline)
- [8. API Contract](#8-api-contract)
  - [8.1 Auth](#81-auth)
  - [8.2 Candidate](#82-candidate)
  - [8.3 Scorecard (Headless)](#83-scorecard-headless)
  - [8.4 Jobs](#84-jobs)
  - [8.5 Applications — Candidate](#85-applications--candidate)
  - [8.6 Applications — HR](#86-applications--hr)
  - [8.7 Outcomes & Calibration](#87-outcomes--calibration)
  - [8.8 Org — ROI, ATS, Fairness](#88-org--roi-ats-fairness)
- [9. Key Database Models](#9-key-database-models)
- [10. Outcome Learning & Transfer Learning](#10-outcome-learning--transfer-learning)
  - [10.1 Cross-Client Transfer Learning](#101-cross-client-transfer-learning-cold-start-solution)
  - [10.2 Calibration Analytics](#102-calibration-analytics)
  - [10.3 ROI Dashboard](#103-roi-dashboard)
  - [10.4 Fairness & Disparate Impact Reporting](#104-fairness--disparate-impact-reporting)
- [11. Commercial Layer & ATS Integration](#11-commercial-layer--ats-integration)
  - [11.1 Native ATS Connectors](#111-native-ats-connectors)
  - [11.2 Multi-Tenancy Architecture](#112-multi-tenancy-architecture)
  - [11.3 Candidate Contestation Workflow (GDPR Article 22)](#113-candidate-contestation-workflow-gdpr-article-22)
- [12. Environment Variables](#12-environment-variables)
- [13. Verification Plan](#13-verification-plan)
- [14. 24-Week Development Roadmap](#14-24-week-development-roadmap)
  - [Stage 1 — Foundation (Weeks 1–2)](#stage-1--foundation-weeks-12)
  - [Stage 2 — Core Scoring Pipeline (Weeks 3–6)](#stage-2--core-scoring-pipeline-weeks-36)
  - [Stage 3 — Web3 Layer (Weeks 7–10)](#stage-3--web3-layer-weeks-710)
  - [Stage 4 — CV Replacement & Decision Layer (Weeks 11–14)](#stage-4--cv-replacement--decision-layer-weeks-1114)
  - [Stage 5 — Outcomes, ROI & Fairness (Weeks 15–17)](#stage-5--outcomes-roi--fairness-weeks-1517)
  - [Stage 6 — ATS & Commercial (Weeks 18–21)](#stage-6--ats--commercial-weeks-1821)
- [15. Success Metrics](#15-success-metrics)

---

# 0. Core Thesis

> **The Fundamental Shift**
>
> A CV is a claim. Colosseum is evidence. The DecisionCard (PROCEED / REVIEW / REJECT) is the primary output. Everything else supports the decision. A developer's GitHub activity contains most of what a hiring decision actually requires — commit patterns, PR behaviour, collaboration depth, code quality proxies, technology breadth, and seniority signals. For Web3 developers, on-chain deployment history, TVL, program authorship, and smart contract patterns add a cryptographic layer of proof that no CV can replicate. The problem is that raw GitHub and on-chain data is noisy, visibility-uneven, and ecosystem-biased. Colosseum filters, interprets, weights, and presents that data as a decision-ready output — not a dashboard, not a score, not an analytics platform.

## Seven Structural Problems This System Solves

1. Confidence is not intrinsic to scoring (overconfidence risk)
2. Unequal visibility across candidates (public vs. private work bias)
3. Seniority inferred heuristically instead of behaviourally
4. No separation between historical and recent performance
5. Absolute scores lack contextual grounding (no percentiles)
6. Uncertainty not propagated into decision-making
7. No feedback loop from hiring outcomes

---

# 1. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10, TypeScript 5, `"module": "commonjs"` |
| ORM | Prisma 7 |
| Database | PostgreSQL 15 + Row Level Security |
| Cache + Queue | Redis 7 + BullMQ + `@nestjs/bullmq` |
| GitHub Client | `@octokit/rest` + `@octokit/graphql` |
| Auth | `passport-github2` + `@nestjs/jwt` + `passport-jwt` |
| Token Security | Node.js `crypto` AES-256-GCM |
| Web3 (EVM) | `viem` (read-only) |
| Web3 (Solana) | `@solana/web3.js` (read-only, RPC-native) |
| Web3 (TVL) | DeFiLlama public API (no key required) |
| Web3 (Build Verification) | `solana-verify` (Docker-sandboxed, async) |
| Config | `@nestjs/config` + Zod env schema (fail at startup) |
| Validation | `zod` + `nestjs-zod` |
| Security | `helmet`, `@nestjs/throttler` |
| Email | `resend` |
| Logging | `nestjs-pino` + `pino-http` |
| PDF generation | `puppeteer` (interviewer brief PDF) |
| Error tracking | `@sentry/node` |
| Testing | `jest`, `@nestjs/testing`, `supertest` |

---

# 2. Project Structure

```
src/
├── main.ts / app.module.ts
├── config/env.schema.ts                  # Zod — fail at startup
├── prisma/prisma.service.ts
├── redis/redis.service.ts
│
├── modules/
│   ├── auth/                             # GitHub OAuth + JWT
│   ├── profile/                          # Candidate profile, web3 address
│   ├── github-sync/                      # Trigger + status polling
│   ├── jobs/                             # Read-only stub (HR team owns CRUD)
│   ├── applications/                     # Apply + HR decision views
│   ├── outcomes/                         # HireOutcome capture + calibration
│   ├── ats/                              # Greenhouse / Lever / Workday connectors
│   ├── fairness/                         # Disparate impact reports
│   ├── roi/                              # ROI dashboard
│   └── admin/                            # Queue stats, calibration analytics
│
├── scoring/                              # Pure domain — no HTTP surface
│   ├── github-adapter/
│   ├── web3-adapter/                     # viem (EVM) + @solana/web3.js — RPC-native
│   ├── web3-ast-adapter/                 # AST analysis of Rust/Anchor/Solidity repos
│   ├── firewall/                         # HackathonDetector + fraud rules + AirdropFarmerFilter
│   ├── signal-engine/                    # 34 GitHub-derived signals
│   ├── web3-signal-engine/               # 25 on-chain signals across 4 sub-pillars
│   ├── data-completeness-engine/
│   ├── privacy-adjustment-engine/
│   ├── behavior-classifier/              # 7 BehaviorPatterns incl. WEB3_SPECIALIST
│   ├── career-phase-engine/              # Gap detection, peak-career window
│   ├── ecosystem-normaliser/             # 25+ cohorts
│   ├── temporal-score-layering/          # Peak / Recent / Trend
│   ├── percentile-calculator/
│   ├── role-fit-engine/
│   ├── gap-analysis-engine/
│   ├── confidence-envelope/              # Risk Level mapping + Stealth Senior override
│   ├── capability-translator/            # Signals → Capability Statements
│   ├── developer-snapshot-builder/       # DeveloperSnapshot first-class object
│   ├── career-timeline-reconstructor/
│   ├── decision-card-generator/          # PROCEED / REVIEW / REJECT
│   ├── claim-generator/
│   └── interview-probe-library/          # STAR questions + Web3 technical vetting
│
├── scorecard/
│   ├── scorecard.controller.ts           # POST /api/scorecard/preview (headless)
│   └── scorecard.service.ts              # previewForUsername() — no DB write
│
├── queues/
│   ├── github-sync.processor.ts
│   ├── signal-compute.processor.ts
│   ├── web3-ast.processor.ts             # Async AST analysis job
│   ├── verified-build.processor.ts       # Async solana-verify Docker job
│   ├── rescore.processor.ts
│   ├── notification.processor.ts
│   ├── ats-sync.processor.ts
│   └── prior-calc.processor.ts           # Monthly PlatformPrior recompute
│
└── shared/
    ├── guards/ decorators/ interceptors/
    ├── crypto.util.ts
    └── weight.util.ts
```

---

# 3. Architecture

## 3.1 Architecture Decision Records

| ADR | Decision | Rationale |
|---|---|---|
| ADR-001 | Modular monolith (NestJS modules) | Clean domain boundaries; extract to microservices later without redesign |
| ADR-002 | BullMQ on Redis for async ingestion | GitHub rate limits make sync ingestion infeasible (3–10 min/profile) |
| ADR-003 | Scorecard computed at apply-time; signals cached at ingest | One profile → many role types with different weight matrices |
| ADR-004 | Fraud signals reduce confidence, not roleFitScore | Fraud triggers have innocent explanations; confidence reduction prompts review |
| ADR-005 | Low-visibility profiles: dynamic weight rebalancing, not penalty | Absence of public data is a measurement problem, not a performance signal |
| ADR-006 | BehaviorClassifier replaces heuristic seniority inference | Commit count and repo age are poor proxies; pattern-based classification is fairer |
| ADR-007 | Temporal scoring separates historical strength from recent activity | Both questions matter; each needs an independent answer |
| ADR-008 | Percentile scoring is additive — does not replace absolute scores | Both cross-ecosystem and cohort-normalised views are always shown |
| ADR-009 | Signal dominance cap: 40% per signal category | Prevents high-visibility GitHub devs from outscoring private-repo devs |
| ADR-010 | Web3 signals as optional pillar, scored only for Web3 roles | Wallet signals are opt-in; non-Web3 devs are never penalised |
| ADR-011 | Smart contract authorship via ABI hash match, not deployer wallet | Company-owned deployer wallets don't break developer attribution |
| ADR-012 | Headless scorecard API callable without a user account | Testing and CI pipelines decouple from the user session layer |
| ADR-013 | DeveloperSnapshot is a first-class database model | 10-second CV replacement must be a stored object, not a derived UI element |
| ADR-014 | Capability statements replace raw signal exposure | Raw signals are not useful to recruiters; translated statements are |
| ADR-015 | DecisionCard is the primary output, not a secondary view | The decision is the product; scorecard data supports it |
| ADR-016 | PostgreSQL RLS for multi-tenancy, not separate schemas | Row-level enforcement with single schema and manageable operational overhead |
| ADR-021 | JD parser uses Anthropic API, not rule-based NLP | Job descriptions are too varied for regex. LLM extraction + HR confirmation |
| ADR-022 | Dynamic weights require HR confirmation before activation | Silently changing scoring criteria would be a trust violation |
| ADR-023 | Interview probes are template-driven, not AI-generated in production | Static templates are reviewable, consistent, and auditable |
| ADR-024 | Outcome data collection is voluntary, never mandatory | Mandatory submission would be a barrier to HR adoption |
| ADR-025 | Weight updates from outcome data require human review | Autonomous weight updates risk gaming and unpredictable score drift |
| ADR-026 | Candidate self-gap view exposes gaps, not interview probes | Candidates seeing probes would allow scripted answers defeating their purpose |
| ADR-027 | Minimum sample thresholds exclude signals, not zero them | Zeroing a signal is a systematic bias against new/private-work developers |
| ADR-028 | ATS integration is webhook-out only at MVP; native connectors in v7 | Covers the most valuable use case without the integration maintenance burden |
| ADR-029 | ConfidenceEnvelope always surfaced alongside every score | A score without confidence is data without context |
| ADR-030 | Fraud signals → confidence reduction, not roleFitScore | Many triggers have innocent explanations; pre-deciding is unfair |
| ADR-031 | Low-visibility: dynamic weight rebalancing, not score penalty | Measurement problem, not performance signal |
| ADR-032 | BehaviorPattern replaces heuristic seniority inference | Review/commit ratios and scope signals > commit count proxies |
| ADR-033 | Temporal scoring separates historical strength from recent activity | Both questions need independent answers |
| ADR-034 | Career gaps are noted, never penalised | Parental leave, health recovery, etc. are not performance signals |
| ADR-035 | Percentile scoring is additive — does not replace absolute scores | Both cross-ecosystem and cohort-normalised views always shown |
| ADR-036 | Signal dominance cap of 40% per signal type category | Prevents high-visibility bias |
| ADR-037 | ROI dashboard uses industry benchmarks for cold-start | New clients must see value before they have enough data |
| ADR-038 | Platform prior: 50/50 blend at 15 outcomes, 80/20 at 50 | Conservative; org data dominates only when statistically meaningful |
| ADR-039 | ATS connectors use OAuth 2.0; no API key-only auth | OAuth tokens expire and can be revoked without changing credentials |
| ADR-040 | Multi-tenancy via Postgres RLS, not separate schemas | Single schema, row-level enforcement, manageable overhead |
| ADR-041 | Candidate contestation stores full lifecycle in AuditLog | GDPR Article 22 requires documented review path |
| ADR-042 | Disparate impact uses Fisher's exact test at p<0.05 | Standard threshold in employment law contexts |
| ADR-043 | New cohorts require 200 developers before creation | Balances accuracy against time cost of waiting for larger pool |
| ADR-044 | STAR questions are gap-severity gated, not role-type gated | Severity-gating ensures interviewers probe hardest where system is most uncertain |
| ADR-045 | Pattern accuracy disclosure shown until n≥200 per pattern | Transparency builds more trust than silence |
| ADR-046 | Competitive positioning document is a product deliverable | Engineering without a sales narrative does not generate revenue |
| ADR-047 | Stealth Senior detection overrides MINIMAL confidence tier | When a candidate's wallet shows upgrade authority over a program with ≥ $1M cumulative volume AND GitHub dataCoveragePercent is < 40% (which would normally trigger score withheld), the system must NOT withhold the score. Instead: set `stealthSeniorDetected: true`, override visibilityTier to PARTIAL, and display a prominent HR note: "Low public GitHub activity but verified on-chain deployment authority — this developer likely works in private or enterprise contexts. On-chain evidence is the primary signal." This is the most important Web3 ADR because it directly inverts the confidence logic for a specific and identifiable class of developer. |
| ADR-048 | AST-level code analysis is a separate pass, not a signal engine concern | PDA derivation patterns, instruction discriminators, and account reallocation signals require parsing Solana/Rust/Anchor source code at the AST level. This must run as a separate `web3-ast-adapter` service distinct from the GitHub adapter, because it operates on file content not metadata. It produces structured findings that feed into the web3 signal engine. It must never block the main signal pipeline — run in parallel, merge results before the web3 signal engine step. |
| ADR-049 | TVL data requires an external protocol registry, not RPC alone | Lindy TVL cannot be computed from Solana RPC alone — RPC gives you account balances, not protocol-labelled TVL. TVL must be sourced from DeFiLlama's public API (no key required) keyed by program address. If DeFiLlama is unavailable, the signal is excluded (not zeroed) — same minimum sample threshold logic as all other signals. Cache TVL data for 24 hours. |
| ADR-050 | Verified Build Match requires reproducible build infrastructure | The Verified Build Match signal (cryptographic proof that GitHub source = on-chain bytecode) uses Solana's `solana-verify` toolchain. This requires running a reproducible build in a sandboxed Docker environment. At MVP, this signal is computed asynchronously — it does not block the main pipeline. It is stored as a separate `verifiedBuildResult` on Web3Profile and merged into the scorecard when available (typically within 5–15 minutes of wallet submission). |

---

## 3.2 System Architecture Pipeline

```
GitHub / Web3 APIs
        ↓
Adapters (GitHub REST + GraphQL + Events, Web3 RPC, Web3 AST — parallel)
        ↓
Low-Signal Firewall (incl. Airdrop Farmer filter for Web3)
        ↓
Signal Engines (34 GitHub signals + 25 Web3 signals — parallel where possible)
        ↓
Classification & Context (BehaviorClassifier, CareerPhaseEngine, Stealth Senior check)
        ↓
Normalisation & Temporal Scoring (EcosystemNormaliser, TemporalScoreLayering, PercentileCalculator)
        ↓
Scoring & Gap Analysis (RoleFitEngine with Web3 sub-pillar weighting, GapAnalysisEngine)
        ↓
Output Generation (CapabilityTranslator, DeveloperSnapshotBuilder, CareerTimelineReconstructor, ClaimGenerator)
        ↓
Final Views (DecisionCard, InterviewBrief PDF with Web3 technical vetting section)
```

---

# 4. Features

## 4.1 Low-Signal Firewall

The most important single component in the system. Runs before any signal computation. Operates in conservative mode: when in doubt, preserves data rather than discards it.

```mermaid
flowchart TD
    A[Raw GitHub + Web3 Data] --> B[Low-Signal Firewall]

    subgraph B [Low-Signal Firewall]
        direction TB
        F1[Bot Detection]
        F2[Tutorial Detection]
        F3[Fork Filtering]
        F4[Spam Pattern Detection]
        F5[Hackathon Detection]
        F6[Airdrop Farmer Detection]
    end

    B --> C[Clean Data]
```

| Filter Type | Detection Method | Action |
|---|---|---|
| Zero-effort forks | Fork with zero original commits from user | Exclude entirely from scoring |
| Tutorial / bootcamp repos | File-structure signature: index.html + style.css + app.js, no test files | De-weight (not delete); junior first projects are understandable |
| Bot-pattern commit bursts | 50+ commits in 3 hours, uniform messages, Sunday/off-hours clustering | Flag; exclude from quality signals; reduce confidence |
| Green-wall streak preservation | One-line commit every day — streak continuity with minimal diff size | Exclude streak continuity from all scoring pillars |
| Pure README activity | Entire commit history is documentation edits only | Excluded from code-quality signals; preserved for contribution context |
| Hackathon burst | HackathonDetector whitelist + 48–72h intense burst followed by silence | Labelled correctly as hackathon — not flagged as gaming |
| Airdrop farmer pattern | High-volume low-value transactions with zero program deployments | Confidence penalty (not score penalty) per ADR-004; caveat added to HR view |

---

## 4.2 Signal Engine — 34 Scored Signals

### GitHub-Derived Signals (Stages 2)

| Signal | HR-Readable Name | Pillar | Formula Summary |
|---|---|---|---|
| activeWeeksRatio | Coding consistency | Activity | Meaningful commits / total weeks (1yr) |
| commitConsistencyScore | Commit reliability | Activity | Variance vs. developer's own median baseline |
| prThroughput90d | Output volume | Activity | PR count / normalised 90d window |
| privateOrgActivity | Private work evidence | Activity | Boolean presence of PushEvents on private org repos (Events API) |
| reviewDepth | Code review depth | Collaboration | Avg review comments per PR reviewed |
| prReviewCount12m | Review participation | Collaboration | Total PR reviews in trailing 12 months |
| externalPrRatio | External contributions | Collaboration | PRs to repos user does not own / total PRs |
| coreProtocolPrMerges | Core protocol contributions | Collaboration | Merged PRs to Web3 prestige repo whitelist (solana-labs/solana, coral-xyz/anchor, jito-foundation/jito-solana, ethereum/go-ethereum, paradigmxyz/reth, foundry-rs/foundry, OpenZeppelin/openzeppelin-contracts, Uniswap/v3-core, aave/aave-v3-core) |
| securityKeywordReviewDepth | Security review depth | Collaboration | Ratio of reviews containing security-critical terms (reentrancy, overflow, underflow, access control, uninitialized, leak, double spend, front-run, sandwich, MEV, flash loan, oracle manipulation) |
| prestigeForkToPrRatio | Prestige fork-to-PR ratio | Collaboration | Among forks of repos with ≥ 500 stars, ratio of those with ≥ 1 merged upstream PR. Min sample: 3 prestige forks. |
| prAcceptanceRate | Code acceptance rate | Quality | Merged PRs / opened PRs (excl. own repos) |
| changeRequestFrequency | First-pass correctness | Quality | Change requests before approval / all reviews received |
| reworkRatio | Code iteration rate | Quality | Post-review commits / total commits per PR |
| testFilePresence | Testing practice | Reliability | Boolean per repo (Linguist file tree scan) |
| cicdConfigDetection | CI/CD usage | Reliability | Boolean: GitHub Actions / Hardhat / Foundry / Anchor configs present |
| starsOnOriginalRepos | Community reception | Impact | Weighted sum by repo age and ecosystem size |
| highPrestigeRepoContributions | OSS prestige | Impact | Binary presence + weight by repo star/contributor count vs. curated list |
| newLanguagesAdopted1yr | Learning velocity | Growth | Unique languages added in past 12 months (Linguist diff) |
| seniorityTrajectory | Career progression | Growth | Trend line of review/architecture contributions vs. commit-only work |
| languageEvolutionTrajectory | Web3 learning path | Growth | Directional score for TS/JS → Rust/Go → Solidity/Anchor progression. Score 1.0 full path, 0.5 partial, 0.0 no trajectory. Weighted 0 for non-Web3 roles. |

> **Minimum sample thresholds** are enforced per signal — see section 5.3. Excluded signals are logged, not zeroed.

---

## 4.3 ConfidenceEnvelope → Risk Level Mapping

| Tier | Score Range | Risk Level | HR Guidance |
|---|---|---|---|
| FULL | ≥ 0.80 | LOW_RISK | Proceed on scorecard. Evidence is sufficient for confident decision. |
| PARTIAL | 0.55–0.79 | MEDIUM_RISK | Proceed with awareness. Score is directionally reliable. Flag gaps for interview. |
| LOW | 0.35–0.54 | HIGH_RISK | Review before advancing. Significant data gaps detected. Weight interview heavily. |
| MINIMAL | < 0.35 | INSUFFICIENT_DATA | Score withheld. Shown as: "Insufficient public data — not a quality signal." |

> **Data Coverage Minimum Viability:** If a candidate's evaluable data coverage is below 40%, the overall score is withheld. HR is shown: "Insufficient public data — not a quality signal. This developer likely works primarily in private repositories." No score is better than a misleading score.
>
> **Stealth Senior Exception (ADR-047):** If `stealthSeniorDetected: true`, this threshold is overridden regardless of GitHub data coverage. See section 5.7.

---

## 4.4 BehaviorClassifier Patterns

| Pattern | HR Label | Key Detection Signals |
|---|---|---|
| REVIEW_HEAVY_SENIOR | Senior/Staff pattern: leads through review and architecture rather than volume coding | reviewDepth > 0.7, reviewCount/commitCount > 0.4, avgPRDescriptionLength > 200 chars, architecture-scope PRs present |
| COMMIT_HEAVY_MIDLEVEL | Mid-level pattern: reliable individual contributor, collaborative, delivery-focused | commitConsistencyScore > 0.65, reviewDepth < 0.5, externalPrRatio > 0.2, feature-level PR scope |
| BALANCED_CONTRIBUTOR | Well-rounded contributor: both builds and reviews at consistent level | Balanced commit + review + external PR ratios |
| OSS_COLLABORATOR | Open-source specialist: cross-ecosystem contributor, strong community presence | High external PR ratio, high prestige repo contributions, broad language breadth |
| EARLY_CAREER | Emerging developer: strong growth signals; evaluate for growth potential over track record | Account < 18 months OR < 6 active months; rapidly evolving stack; elevated reworkRatio (learning signal) |
| RETURNING_DEVELOPER | Returning developer: prior strong track record; recent activity resuming after gap | Career gap > 3 months + historicalStrength > 65 + recent activity resuming within last 3 months |
| WEB3_SPECIALIST | Web3-native developer: smart contract experience with verified on-chain presence | Solidity/Rust/Vyper files, Hardhat/Foundry/Anchor configs, on-chain deployment evidence, PDA derivation patterns, CPI composition signals |

> **Pattern Accuracy Disclosure:** Until the validation study achieves n≥200 outcomes per pattern, every BehaviorPattern label carries the disclosure: "Pattern classification is rule-based and hypothesis-generating. Treat as a starting point for interviewer investigation, not a concluded assessment." `primaryConfidence` is shown alongside every HR label.

---

## 4.5 Temporal Scoring

| Window | Duration | Question Answered |
|---|---|---|
| Peak-career | Best 24-month period ever | What is this developer capable of at their best? Preserved at full weight regardless of career gaps. |
| Recent | Last 6 months | Are they currently active? Supplementary signal only, never the primary measure. Weight configurable per job. |
| Trend | Rolling 12-month slope | ASCENDING / STABLE / DECLINING / RETURNING — drives Career Timeline trajectory field. |

Career gaps (> 90 days) are labelled as context for HR — NEVER used as a score deduction. ADR-034 records this as a design requirement, not an option.

---

## 4.6 Role-Fit Weight Matrix

| Pillar | JUNIOR | MID | SENIOR | LEAD | Notes |
|---|---|---|---|---|---|
| Technical Prowess | 40% | 30% | 20% | 15% | Language depth + breadth |
| Reliability (Testing/CI) | 20% | 35% | 25% | 20% | Tests, CI/CD, rework ratio |
| Collaboration | 15% | 20% | 35% | 45% | Review depth, external PRs, security keyword reviews, core protocol PRs |
| Innovation / Impact | 25% | 15% | 20% | 20% | Stars, prestige repos, OSS |
| Architecture (Senior+) | 0% | 0% | 0–15%* | 0–15%* | *Redistributed from other pillars when architectural PRs detected |
| Web3 (opt-in) | Optional | Optional | Optional | Optional | 20% additive for Web3 roles; renormalise other pillar weights; internally distributed across 4 Web3 sub-pillars per section 5.6 (ADR-010) |

Signal dominance cap: no single signal category > 40% of total weight (ADR-009). Weights are stored as configuration, never hardcoded.

---

## 4.7 Gap Analysis Engine

Runs at apply-time, after RoleFitEngine. Produces the GapReport — the primary decision-support output.

```mermaid
flowchart TD
    A[Role Fit Score] --> B{Meets Requirements?}
    B -->|No| C[DEALBREAKER]
    B -->|Partially| D[SIGNIFICANT GAP]
    B -->|Mostly| E[MINOR GAP]
    C --> F[Interview Required]
    D --> F
    E --> G[Optional Check]
```

| Gap Severity | Definition | HR Action |
|---|---|---|
| DEALBREAKER | Hard gate (requiredSignals.min not met) | Interview mandatory; overallVerdict → UNLIKELY_FIT |
| SIGNIFICANT | Signal below threshold with material gap | Flag for interview probing; probe question generated |
| MINOR | Signal below threshold with small gap; may be pattern-expected | Optional verification; note shown with mitigating context |

---

## 4.8 Fraud Signal Handling

Fraud signals should reduce **confidence**, not `roleFitScore`. Pre-deciding against a candidate before human review is unfair, as many fraud-detection triggers have legitimate explanations such as hackathons, corporate VPNs, shared university networks, or bootcamp repositories. The Airdrop Farmer pattern follows the same rule — high-volume wallet activity without program deployments reduces confidence but does not reduce the roleFitScore.

```ts
if (fraudTier === FraudTier.LIKELY_FRAUDULENT) {
  confidenceEnvelope.overallConfidence *= 0.50;
  confidenceEnvelope.caveats.push({
    signalKey: "fraudDetection",
    hrReadable: "Unusual activity patterns detected — recommend manual verification",
    severity: "WARNING",
  });
}

if (web3FraudFlags.airdropFarmerDetected) {
  confidenceEnvelope.overallConfidence *= 0.75;
  confidenceEnvelope.caveats.push({
    signalKey: "airdropFarmer",
    hrReadable: "High-volume low-value on-chain activity with no program deployments — wallet may be a farming wallet, not a developer wallet",
    severity: "WARNING",
  });
}
```

- `roleFitScore` represents candidate capability and remains unaffected by fraud signals.
- `confidenceEnvelope` represents trust in the data and is the correct place to reflect uncertainty or risk signals.

---

## 4.9 CV Replacement Layer — Three Mandatory Output Objects

Every scored profile produces three objects that together replace a CV. These are first-class data model objects produced before any output reaches a recruiter.

```mermaid
flowchart LR
    A[Signals + Scores] --> G[CV Replacement Layer: Snapshot + Timeline + Capabilities + Decision]
    G --> F[Final Candidate View]
```

### DeveloperSnapshot (10-Second Understanding Layer)

| Snapshot Field | Content | Source |
|---|---|---|
| Role | Primary inferred role type (BACKEND, FRONTEND, WEB3, etc.) | RoleClassifier — top-1 with confidence % |
| Seniority | JUNIOR / MID / SENIOR / LEAD + confidence % | BehaviorClassifier output |
| Summary | 1–2 sentences describing primary capability | Auto-generated from top BehaviorPattern + top 2 capability statements |
| Risk Level | LOW / MEDIUM / HIGH / INSUFFICIENT_DATA | Mapped from ConfidenceEnvelope tier; Stealth Senior overrides INSUFFICIENT_DATA |
| Decision Signal | PROCEED / REVIEW / REJECT | Primary DecisionCard output — visible at list level, not only detail level |
| Stealth Senior Flag | STEALTH_SENIOR badge when applicable | Wallet upgrade authority ≥ $1M volume with sparse GitHub (ADR-047) |

### Career Timeline Reconstruction

Reconstructs the developer's work history from observable behaviour: career phases, activity trends (ASCENDING/STABLE/DECLINING/RETURNING), career gaps (noted, never penalised), peak-career window (best 24-month period), and inferred employer context. For WEB3_SPECIALIST candidates, includes on-chain deployment history and TVL milestones as timeline events.

### Context Reconstruction

Translates raw signals into inferred work environment: Work Environment (Enterprise/OSS/Startup/Academic/Web3-Native), Collaboration Style (Solo builder/Team contributor/Code review leader/Protocol contributor), Team vs. Solo Pattern, Ecosystem Context.

---

# 5. Scoring Pipeline Detail

## 5.1 DataCompletenessEngine

| VisibilityTier | Threshold | Action |
|---|---|---|
| FULL | ≥ 80% signals evaluable | Normal scoring; full confidence |
| PARTIAL | 50–79% | Excluded pillars removed from denominator; completenessNote shown when score < 0.70 |
| LOW | 25–49% | Dynamic weight rebalancing; prominently shown to HR |
| MINIMAL | < 25% | overallConfidence capped at 0.45; score withheld if dataCoveragePercent < 40% |

`privateWorkIndicatorsDetected` (high commit rate + low public activity + private-repo signals): positive note added: "Profile shows evidence of private or confidential work — public signals may underrepresent full capability."

**Stealth Senior override (ADR-047):** If wallet signals show program upgrade authority with ≥ $1M cumulative volume, the MINIMAL tier score-withhold is bypassed. See section 5.7.

---

## 5.2 Ecosystem Normaliser — 25+ Cohorts

| Cohort Group | Primary Signals | Min Dataset |
|---|---|---|
| TypeScript/Node.js Web | TypeScript 70%+, Node ecosystem | 500+ developers |
| Python/ML & Data | Python 70%+, Jupyter, Kaggle signals | 400+ developers |
| Rust/Systems | Rust 70%+, systems programming signals | 300+ developers |
| Java/Spring Enterprise | Java 70%+, Spring/Maven signals | 500+ developers |
| Go/Backend | Go 70%+, backend service patterns | 300+ developers |
| Swift/iOS | Swift 70%+, Apple framework signals | 300+ developers |
| Kotlin/Android | Kotlin 70%+, Android SDK signals | 300+ developers |
| Solidity/Web3 EVM | Solidity/Vyper, EVM deployment evidence, Hardhat/Foundry configs | 200+ developers |
| Rust/Solana Web3 | Rust 70%+, Anchor configs, on-chain deployment evidence | 200+ developers |
| C++/Embedded | C/C++ 70%+, low public repo, hardware signals | 200+ developers |
| Ruby/Rails Web | Ruby 80%+, Rails framework signals | 500+ developers |
| PHP/Laravel Web | PHP 80%+, Laravel/Symfony signals | 500+ developers |
| Scala/Spark Data | Scala 70%+, JVM ecosystem signals | 300+ developers |
| DevOps/Infrastructure | HCL/YAML 50%+, Terraform, Ansible signals | 400+ developers |
| QA/Test Automation | Test framework signals, low feature PR ratio | 300+ developers |
| C#/.NET Enterprise | C# 70%+, .NET ecosystem signals | 500+ developers |
| Elixir/Phoenix | Elixir 70%+, functional style signals | 200+ developers |
| R/Statistical Computing | R 60%+, CRAN packages, academic signals | 200+ developers |
| Dart/Flutter Mobile | Dart 70%+, Flutter SDK signals | 300+ developers |
| Machine Learning Research | Python 70%+, Jupyter, high paper/repo cross-reference | 400+ developers |
| Security/Pentest | Multi-language, security-tool repos, CVE references | 200+ developers |

Dynamic cohort creation: EcosystemCohortClassifier flags developers with cohort confidence < 0.45 → routes to UNCATEGORISED pool. When pool reaches 200 developers with consistent signal patterns → new cohort proposed for review.

---

## 5.3 Minimum Sample Thresholds

| Signal | Minimum Sample | If Below Minimum | Note |
|---|---|---|---|
| prAcceptanceRate | ≥ 10 PRs | Excluded from quality pillar | Common for junior devs |
| changeRequestFrequency | ≥ 10 reviewed PRs | Excluded | Shown as "Not enough review history to assess" |
| reworkRatio | ≥ 10 merged PRs | Excluded | Cannot compute without merge history |
| reviewDepth | ≥ 5 reviews given | Excluded from collab pillar | Junior devs may not have been in position to review |
| commitConsistencyScore | ≥ 6 active months | Excluded from activity pillar | New accounts or career changers |
| stackEvolutionScore | ≥ 18 months history | Excluded from growth pillar | Cannot assess evolution with < 18 months |
| highPrestigeRepoContrib | ≥ 3 external PRs merged | Not awarded | Single PR could be luck, not pattern |
| securityKeywordReviewDepth | ≥ 5 reviews given | Excluded | Cannot assess without review history |
| prestigeForkToPrRatio | ≥ 3 prestige forks | Excluded | Not zero — absence of prestige forks means signal not applicable |
| lindyTvl | Program age ≥ 6 months with ≥ $1M TVL | Excluded (not zeroed) | DeFiLlama API miss also excludes rather than zeros (ADR-049) |
| verifiedBuildMatch | Async — 5–15 min post-submission | Pending state shown | Does not block main pipeline (ADR-050) |
| multisigSigner | Wallet connected | Excluded if no wallet | Never penalise absence of wallet registration |

---

## 5.4 Web3 Layer

### Registration

Candidate submits EVM address and/or Solana address. No signature proof required — just the address string (validated format only). Solana signal computation uses `@solana/web3.js` RPC calls directly. Attribution uses program authority lookups and transaction history from Solana RPC.

### Smart Contract Attribution (EVM)

1. Etherscan/Sourcify author — if submitter address matches `evmAddress` → high confidence
2. ABI hash × GitHub repo match — compute ABI hash from dev's repo; compare against on-chain verified contracts → medium confidence
3. Org membership fallback — repo owned by verified org → low confidence ("contributed to")

### Solana Signals (RPC-native, original)

- `getDeployedPrograms` — programs where pubkey is upgrade authority
- `getSPLTokenActivity` — SPL token creation/minting
- `getMetaplexActivity` — NFT program interactions
- `getStakingInteraction` — native staking program calls

---

## 5.5 Web3 Signal Engine — 25 Signals across 4 Sub-Pillars

All Web3 signals are opt-in. They only contribute to scoring when the job role type is WEB3. Non-Web3 candidates are never penalised for absence of wallet data (ADR-010).

### Sub-Pillar 1 — Architectural Depth (35% of Web3 pillar)

These signals require either GitHub AST analysis (`web3-ast-adapter`) or wallet RPC calls. The AST adapter runs as a parallel async job (ADR-048) and never blocks the main signal pipeline.

| Signal | Strength | Source | Detection Method |
|---|---|---|---|
| pdaDerivationPattern | 10/10 | GitHub AST | Detects correct use of `find_program_address` or `create_program_address` with seed construction that prevents account-takeover or collision. The ultimate Solana senior signal. |
| cpiComposition | 9/10 | Wallet + code | Detects `invoke` or `invoke_signed` calls with external program IDs matching Jupiter, Phoenix, Drift, Marinade. Demonstrates ecosystem composability ("Money Legos" skill). |
| cuOptimization | 9/10 | Wallet RPC | Detects transactions where compute unit limit is explicitly set via `SetComputeUnitLimit` instruction rather than using the default. Shows profiling discipline. |
| instructionDiscriminators | 8/10 | GitHub AST | Detects 8-byte discriminator patterns, `#[instruction]` attribute, or Anchor `discriminator` derive. Proves understanding of SVM dispatching vs. template copying. |
| accountReallocation | 8/10 | GitHub code | Detects `realloc` calls on `AccountInfo`. Shows foresight in state management and knowledge of Solana's dynamic account data limits. |
| idempotencyLogic | 7/10 | GitHub review | Detects duplicate-nonce or idempotency guard patterns in instruction handlers. Critical for financial applications. |
| lutUsage | 7/10 | Wallet RPC | Detects versioned transactions using Address Lookup Tables. Proves ability to handle complex multi-account interactions within the 1232-byte limit. |

### Sub-Pillar 2 — Economic & Production Impact (40% of Web3 pillar)

| Signal | Strength | Source | Detection Method |
|---|---|---|---|
| lindyTvl | 10/10 | DeFiLlama API | Program the candidate authored has held ≥ $1M TVL for ≥ 6 months without exploit. Time-weighted. Requires DeFiLlama lookup by program address (ADR-049). |
| verifiedBuildMatch | 10/10 | Chain + GitHub | Cryptographic proof that GitHub source compiles to exactly the on-chain bytecode. Uses `solana-verify` in Docker sandbox. Computed asynchronously (ADR-050). |
| multisigSigner | 9/10 | Wallet RPC | Candidate's pubkey is a signer on a Squads Protocol multisig for a known protocol. Indicates the candidate has passed a high-level manual trust/reputation audit. |
| mainnetUpgradeCycle | 7/10 | Wallet RPC | Detects Buffer account creation and deployment patterns. Frequent clean upgrades indicate mature CI/CD and deployment discipline. |
| crankKeeperUptime | 6/10 | Wallet RPC | High-frequency small transactions to protocol program addresses (Phoenix, Zeta, etc.). Shows infrastructure operations grit. |
| idlOnChainPresence | 5/10 | Wallet RPC | Program has an associated IDL account at the canonical Anchor IDL address. Indicates developer-experience focus and public API commitment. |

### Sub-Pillar 3 — Collaboration & Growth (15% of Web3 pillar)

| Signal | Strength | Source | Detection Method |
|---|---|---|---|
| coreProtocolPrMerges | 10/10 | GitHub | Merged PRs to: solana-labs/solana, coral-xyz/anchor, jito-foundation/jito-solana, ethereum/go-ethereum, paradigmxyz/reth, foundry-rs/foundry, OpenZeppelin/openzeppelin-contracts, Uniswap/v3-core, aave/aave-v3-core. The "Platinum Medals" of Web3 development. |
| securityKeywordReviewDepth | 9/10 | GitHub | Ratio of reviews containing: reentrancy, overflow, underflow, access control, uninitialized, leak, double spend, front-run, sandwich, MEV, flash loan, oracle manipulation. Proves senior-level critical thinking. |
| prestigeForkToPrRatio | 8/10 | GitHub | Among forks of repos with ≥ 500 stars, ratio of those with ≥ 1 merged upstream PR. Differentiates developers who actually contribute from those who collect repos. |
| ecosystemRecognition | 7/10 | Social graph | Weighted PageRank: followers/stars from curated seed list of known Solana founders and core contributors, weighted by seed member's own follower count. Cached 7 days. |
| languageEvolutionTrajectory | 6/10 | GitHub | Score 1.0 for TS/JS → Rust/Go → Solidity/Anchor progression; 0.5 for partial path; 0.0 for no trajectory. Stored for all developers; weighted only for Web3 roles. |

### Sub-Pillar 4 — Risk & Fraud (10% of Web3 pillar)

| Signal | Action | Source | Detection Method |
|---|---|---|---|
| airdropFarmerPattern | Confidence penalty | Wallet | High-volume, low-value transactions with zero program deployments. Signals sybil farmer, not developer. Follows ADR-004: confidence reduction only, roleFitScore unchanged. |
| forkAndForget | Confidence de-weight | GitHub | Already handled by ZeroEffortForkFilter in main Firewall. Extended for Web3: 100+ forks of popular DeFi repos with zero commits. |
| privateOrgPresence | Context signal | Events API | Already present as `privateOrgActivity` in main signal engine. Surfaced here as the "Invisible Seniority" detection that prevents stealth enterprise devs from scoring zero. |

---

## 5.6 Web3 Role-Fit Weight Distribution

When a job role type is WEB3, the 20% additive Web3 pillar is internally distributed as follows. Other pillars are renormalised to sum to the remaining 80%.

| Web3 Sub-Pillar | Weight within Web3 pillar | Primary Signals |
|---|---|---|
| Architectural depth | 35% | pdaDerivationPattern (10), cpiComposition (9), cuOptimization (9) |
| Economic impact | 40% | lindyTvl (10), verifiedBuildMatch (10), multisigSigner (9) |
| Collaboration / growth | 15% | coreProtocolPrMerges (10), securityKeywordReviewDepth (9) |
| Risk / fraud | 10% | airdropFarmerPattern penalty, forkAndForget penalty |

The Stealth Senior override (ADR-047) applies before weighting — it changes the confidence tier, not the signal weights themselves.

---

## 5.7 Stealth Senior Detection

A developer may have very little public GitHub activity but their wallet shows they are the upgrade authority for a program with significant on-chain volume. This is how the most in-demand Solana developers are often missed by conventional screening.

**Detection condition:** `stealthSeniorDetected = true` when ALL of the following are true:

- Candidate's Solana pubkey is the upgrade authority for ≥ 1 deployed program
- That program has ≥ $1M cumulative transaction volume (from RPC) OR ≥ $500K TVL (from DeFiLlama)
- GitHub `dataCoveragePercent` < 40% (would normally trigger score withheld)

**Effect when detected:**

- `visibilityTier` overridden from MINIMAL to PARTIAL
- `scoreWithheld` forced to `false`
- `stealthSeniorDetected: true` written to `CandidateSignals`
- DeveloperSnapshot displays STEALTH_SENIOR badge
- HR note displayed: "Low public GitHub activity but verified on-chain deployment authority — this developer likely works in private or enterprise contexts. On-chain evidence is the primary signal."
- `overallConfidence` set to 0.60 (PARTIAL tier floor) regardless of GitHub coverage
- Interview probes generated from on-chain signal gaps rather than GitHub signal gaps

---

# 6. Job Description Parsing & Gap Analysis

## 6.1 JobDescriptionParser

The parser runs when HR creates or edits a job posting. Uses the Anthropic API to extract structured requirements from free-text job descriptions. HR confirmation is required before saving — the system never silently changes scoring criteria.

| Requirement Field | Description | Usage |
|---|---|---|
| requiredTechnologies | String[] — `["TypeScript", "PostgreSQL", "Anchor"]` | Hard requirement; flagged as dealbreaker if candidate lacks these |
| requiredRoleType | RoleType enum | Used by RoleFitEngine to select weight matrix |
| requiredSeniority | Seniority enum | Used to set seniority tier in scoring |
| collaborationWeight | LOW / MEDIUM / HIGH | Soft requirement; adjusts pillar weights, not a dealbreaker |
| ownershipWeight | LOW / MEDIUM / HIGH | Execution vs. leadership orientation |
| innovationWeight | LOW / MEDIUM / HIGH | Maintenance vs. greenfield orientation |
| isWeb3Role | Boolean | Activates Web3 pillar weighting and Web3 technical vetting probes |
| web3EcosystemFocus | `EVM` / `SOLANA` / `BOTH` | Determines which Web3 sub-pillar signals are prioritised |
| teamSizeSignal | SOLO / SMALL / LARGE | Context shown to HR; not used in scoring |
| domainSignals | String[] — `["fintech", "web3", "defi"]` | Context shown to HR; not used in scoring |
| parserConfidence | Float 0–1 | HR review required if confidence < 0.75 |

---

## 6.2 Technology Matching

Required technologies from the JD are cross-referenced against the candidate's `languageDistribution` and detected tooling. For Web3 roles, this extends to on-chain tooling: Hardhat, Foundry, Anchor, `solana-verify`, and detected smart contract patterns. A `technologyFitScore` (0–100) feeds into the gap analysis as a separate dimension. Missing technologies are listed in gaps with mitigating context if the candidate uses an adjacent technology.

---

## 6.3 STAR-Format Interview Probe Library

| Gap Severity | Pattern Context | Question Type & Example |
|---|---|---|
| DEALBREAKER | Any | Deep STAR probe (mandatory): "Tell me about a time you architected a system at the scale this role requires. What were the constraints and what would you do differently?" — with follow-up prompts |
| SIGNIFICANT | REVIEW_HEAVY_SENIOR | Verification STAR: "Walk me through a recent technical decision you influenced without writing the code. What was the outcome?" |
| SIGNIFICANT | COMMIT_HEAVY_MIDLEVEL | Validation STAR: "Describe a time you had to balance delivery speed with technical quality. How did you decide?" |
| MINOR | Any | Optional verification: "You haven't had much exposure to X in your visible work — have you encountered it in a different context?" |
| Career gap noted | RETURNING_DEVELOPER | Context question (optional): "You've been away from active development for a period — what have you been working on or learning since returning?" |
| Unknowns layer | Any | Mandatory for every unobservable dimension: "This dimension cannot be assessed from visible work — the interviewer should probe directly." |

---

## 6.4 Web3 Technical Vetting Probes

When a candidate has the `WEB3_SPECIALIST` pattern, the Interviewer Brief PDF includes a dedicated **Web3 Technical Vetting** section. These probes are generated per signal gap and are keyed to the specific missing or low-confidence signal.

| Signal Gap | Vetting Probe |
|---|---|
| pdaDerivationPattern gap | "Walk me through how you'd design a PDA derivation scheme for a lending protocol where borrower positions need to be unique per user per collateral token. What seeds would you use and why? What attack vectors does your scheme prevent?" |
| cpiComposition gap | "Describe a time you composed CPIs to interact with an external protocol like Jupiter or Marinade inside your program. What were the safety considerations around signer privileges, and how did you handle CPI signer seeds?" |
| lindyTvl / production gap | "Tell me about the largest program you've shipped to mainnet. What was the peak TVL or transaction volume, and what monitoring and alerting did you have in place? Have you ever had to emergency-upgrade a live program?" |
| verifiedBuildMatch absent | "How do you approach reproducible builds for Solana programs? What's your process for ensuring the deployed bytecode matches your audited source? Are you familiar with solana-verify?" |
| multisigSigner absent (senior roles) | "Have you ever been involved in a protocol's operational security — key management, upgrade authority, multisig signing? Walk me through how that worked and what the key rotation process looked like." |
| cuOptimization gap | "How do you approach compute unit optimisation in your programs? Walk me through a case where you profiled and reduced CU usage. What tools did you use?" |
| securityKeywordReviewDepth gap | "Tell me about a security vulnerability you caught in a code review — your own or someone else's. What was the impact if it had gone to production?" |
| ecosystemRecognition gap | "Which Solana protocols or teams have you collaborated with or contributed to? How do you stay current with ecosystem changes like new SVM features or breaking Anchor updates?" |

---

## 6.5 Interviewer Brief PDF

Generated automatically when an application advances to interview stage. Delivered as a structured PDF per candidate.

- 45-minute interview guide: Opening (5 min) → Technical depth probes (25 min) → Gap-specific STAR questions (10 min) → Candidate Q&A (5 min)
- DeveloperSnapshot shown prominently at top — interviewer has the 10-second CV replacement before reading anything else
- BehaviorPattern label and `primaryConfidence` shown prominently
- Career Timeline summary: interviewer understands work history context before the interview starts
- For `WEB3_SPECIALIST` candidates: Web3 Technical Vetting section inserted between technical depth probes and STAR questions
- Stealth Senior badge and note shown prominently if `stealthSeniorDetected: true`
- Unknowns / Not Observable: explicit list of what the system could not assess and must be probed in the interview
- `VALIDATE_MANUALLY` flags: explicit signals where the system has low confidence and the interviewer should probe directly
- ConfidenceEnvelope caveats with sections where the system could not fully evaluate the candidate
- Optional scoring rubric (1–4 scale) for interviewer completion inline

---

## X. Unknowns / Not Observable — First-Class Output

> **What Colosseum Cannot Assess — Always Shown to Recruiters**
>
> × Communication quality — not observable from code alone
> × System design thinking — architectural PRs are a proxy, not a direct measure
> × Management capability — no observable signal from GitHub activity
> × Cultural fit — not a signal category
> × Intent and motivation — self-reported only; not evaluated
> × Communication quality in code review — PR comment content is not evaluated
> × Interview performance — distinct from engineering capability
>
> For Web3 candidates additionally:
> × Protocol design thinking — on-chain deployments show what was built, not why
> × Economic security reasoning — audit reports are not currently ingested
> × Operational security practices — key management practices beyond multisig presence
>
> These dimensions require interview validation. Colosseum generates targeted questions for each based on the candidate's specific gap profile.

---

# 7. BullMQ Queue Pipeline

```mermaid
flowchart TD
    A[github-sync] --> B[Fetch APIs + Cache]
    B --> C[signal-compute]
    C --> D[Run Full Pipeline]
    D --> E[Store Signals + Snapshot]
    E --> F[notification]

    G[rescore] --> D
    H[prior-calc] --> I[Update Platform Prior]

    C --> J[web3-ast]
    J --> K[AST Analysis Results]
    K --> C2[signal-compute merge]

    C --> L[verified-build]
    L --> M[Store verifiedBuildResult]
```

### github-sync (Concurrency: 5)

1. Decrypt GitHub token
2. Fetch data in parallel: REST API, GraphQL API, Events API
3. Cache responses (Redis, TTL: 24h)
4. Store `rawDataSnapshot`
5. Update `syncProgress`
6. Trigger `signal-compute` job
7. If Web3 repos detected: trigger `web3-ast` job in parallel

### web3-ast (Concurrency: 3)

1. Identify Rust/Anchor/Solidity repos from `rawDataSnapshot`
2. Clone repos to temp directory (shallow, depth 1)
3. Run AST analysis pass: pdaDerivationPattern, instructionDiscriminators, accountReallocation, idempotencyLogic, cpiComposition
4. Store structured findings to `Web3Profile.astFindings` (JSON)
5. Clean up temp directory
6. Signal `signal-compute` that AST results are ready to merge

### verified-build (Concurrency: 1)

1. Load candidate's deployed program address from Web3Profile
2. Clone matching GitHub repo at the commit matching on-chain deployment
3. Run `solana-verify` in Docker sandbox
4. Store result to `Web3Profile.verifiedBuildResult`
5. Trigger scorecard rescore if result changes the signal value

### signal-compute (Concurrency: 10)

1. Apply Low-Signal Firewall (incl. Airdrop Farmer filter)
2. Compute 34 GitHub signals; minimum sample thresholds enforced; ConsistencyValidator
3. Merge Web3 AST findings (wait with timeout — AST results are not blocking)
4. Compute 25 Web3 signals (RPC + merged AST findings)
5. Run DataCompletenessEngine + PrivacyAdjustmentEngine
6. Check Stealth Senior condition (ADR-047) — may override visibility tier
7. Classify: BehaviorClassifier, CareerPhaseEngine
8. Compute: EcosystemNormaliser, TemporalScoreLayering, PercentileCalculator
9. Enforce signal dominance cap (40% per category)
10. Build ConfidenceEnvelope → Risk Level
11. Generate: DeveloperSnapshot, CareerTimeline, CandidateSignals, CandidateClaims
12. Store all results in a single Prisma transaction
13. Trigger `notification` job

---

# 8. API Contract

## 8.1 Auth

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | /auth/github | Public | GitHub OAuth redirect |
| GET | /auth/github/callback | Public | Exchange → JWT |
| POST | /auth/refresh | Bearer | Rotate refresh token |
| POST | /auth/logout | JWT | Revoke refresh token |

## 8.2 Candidate

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | /api/me/profile | JWT:CANDIDATE | Full profile + snapshot + timeline |
| PATCH | /api/me/profile | JWT:CANDIDATE | Update bio |
| POST | /api/me/github/sync | JWT:CANDIDATE | Trigger sync (1/24h throttle) |
| GET | /api/me/github/sync/status | JWT:CANDIDATE | `{ status, progress }` |
| POST | /api/me/web3/profile | JWT:CANDIDATE | Set evmAddress / solanaAddress |
| GET | /api/me/gap-preview?jobId=:id | JWT:CANDIDATE | Live GapReport for this candidate against this job's requirements (before applying) |
| DELETE | /api/me | JWT:CANDIDATE | GDPR hard delete |
| POST | /api/candidate/applications/:appId/contest | JWT:CANDIDATE | GDPR Article 22 contestation — flag specific signal with explanation |

## 8.3 Scorecard (Headless)

| Method | Path | Guard | Description |
|---|---|---|---|
| POST | /api/scorecard/preview | X-Internal-Key | `{ githubUsername, roleType }` → ScorecardResult (no persist; uses GITHUB_SYSTEM_TOKEN) |

## 8.4 Jobs

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | /api/jobs | Public | Open jobs (cursor paginated) |
| GET | /api/jobs/:id | Public | Job detail |
| GET | /api/jobs/:id/fit | JWT:CANDIDATE | Live fit preview |
| PATCH | /api/jobs/:jobId/temporal-config | JWT:HR | Set historicalWeight / recentWeight |
| POST | /api/hr/jobs/:jobId/parse-jd | JWT:HR | Parse JD text → ParsedJobRequirements (for HR confirmation) |
| POST | /api/hr/jobs/:jobId/confirm-requirements | JWT:HR | Save confirmed requirements; regenerate dynamicWeights; enqueue rescore |

## 8.5 Applications — Candidate

| Method | Path | Guard | Description |
|---|---|---|---|
| POST | /api/jobs/:id/apply | JWT:CANDIDATE | Apply → freeze DecisionCard + GapReport + TechnologyFit + InterviewProbes |
| GET | /api/me/applications | JWT:CANDIDATE | My applications |
| GET | /api/me/applications/:id | JWT:CANDIDATE | Application + frozen snapshot |

## 8.6 Applications — HR

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | /api/hr/applications | JWT:HR | Ranked list with DecisionCard + Snapshot (filters: fitTier, riskLevel, behaviorPattern, minScore, stealthSenior) |
| GET | /api/hr/applications/:appId | JWT:HR | Full GapReport + evidence links + interview probes + Web3 vetting probes + not-observable list |
| PATCH | /api/hr/applications/:appId/decision | JWT:HR | SHORTLIST / REJECT / FLAG / REQUEST_INFO → AuditLog |
| PATCH | /api/hr/applications/bulk | JWT:HR | Bulk status update |
| POST | /api/hr/compare | JWT:HR | Side-by-side up to 4 applications |
| GET | /api/hr/applications/:appId/confidence | JWT:HR | ConfidenceEnvelope for this application |
| GET | /api/hr/applications/:appId/temporal | JWT:HR | TemporalProfile — historical/recent breakdown, trajectory, gap notes |
| GET | /api/hr/applications/:appId/behavior | JWT:HR | BehaviorClassification — primaryPattern, primaryConfidence, hrLabel |
| GET | /api/hr/applications/:appId/percentile | JWT:HR | PercentileProfile — rawScore, percentile, cohort, cohortSize, percentileLabel |
| GET | /api/hr/applications/:appId/web3 | JWT:HR | Web3 signal detail — sub-pillar scores, verifiedBuildResult, stealthSeniorDetected, on-chain metrics |
| PATCH | /api/hr/applications/:appId/contest/resolve | JWT:HR | REVIEWED / ACTIONED / DISMISSED → AuditLog; if ACTIONED → enqueue rescore |
| POST | /api/hr/applications/:appId/interview-brief | JWT:HR | Generate PDF; mark interviewBriefSentAt; optionally email interviewer |

## 8.7 Outcomes & Calibration

| Method | Path | Guard | Description |
|---|---|---|---|
| POST | /api/outcomes | JWT:HR | Record wasHired + performanceRating (1–5, at 90 days) |
| GET | /api/admin/calibration/behavior-outcomes | JWT:ADMIN | Pattern → hire rate (≥ 15 outcomes) |
| GET | /api/admin/calibration/trajectory-outcomes | JWT:ADMIN | Hire rate and retention rate by temporal trajectory type |
| GET | /api/admin/platform-prior | JWT:ADMIN | Current platform prior weights by BehaviorPattern |
| POST | /api/admin/platform-prior/recompute | JWT:ADMIN | Trigger anonymised aggregate recomputation. Scheduled monthly; manual trigger available. |

## 8.8 Org — ROI, ATS, Fairness

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | /api/hr/orgs/:orgId/roi | JWT:HR_ADMIN | ROI dashboard for last 30/90/365 days. Cold-start returns industry benchmarks. |
| GET | /api/hr/orgs/:orgId/roi/history | JWT:HR_ADMIN | Time series of ROI metrics for trend display |
| POST | /api/hr/orgs/:orgId/ats/connect | JWT:HR_ADMIN | Complete ATS OAuth flow (Greenhouse / Lever / Workday) |
| POST | /api/hr/orgs/:orgId/ats/sync | JWT:HR_ADMIN | Trigger manual two-way ATS sync for all open jobs |
| GET | /api/hr/orgs/:orgId/ats/sync/:syncJobId | JWT:HR_ADMIN | Sync status (queued / running / complete / failed) and record counts |
| GET | /api/hr/orgs/:orgId/fairness-report | JWT:HR_ADMIN | Quarterly disparate impact report PDF (?quarter=YYYY-QN) |
| GET | /api/admin/fairness/platform-summary | JWT:ADMIN | Cross-org fairness summary for internal monitoring |

---

# 9. Key Database Models

All models include `tenantId` for RLS enforcement. Schema is migration-first via Prisma 7. JSONB columns store flexible signal data without schema explosion.

| Model | Key Fields | Purpose |
|---|---|---|
| Organisation | tenantId (PK, RLS key), name, atsConnector (Json), priorBlendRatio (Float) | Multi-tenant root. ATS connector config and transfer learning blend ratio. |
| User | id, tenantId?, email, role (UserRole), accountStatus | null tenantId = CANDIDATE; set for HR/ADMIN. Roles: CANDIDATE, HR, HR_ADMIN, ORG_MANAGER, ADMIN |
| Candidate → DeveloperCandidate | userId, bio, careerPath; devProfile, githubProfile, web3Profile, signals, snapshot, timeline, claims | Modular user model; enables future non-developer types without schema changes |
| GithubProfile | githubUsername, githubUserId, encryptedToken (AES-256-GCM `v1:<iv>:<tag>:<cipher>`), syncStatus, syncProgress, rawDataSnapshot | GitHub OAuth token encrypted at rest; sync pipeline state machine |
| Web3Profile | evmAddress?, solanaAddress?, verifiedContracts (Json), onChainMetrics (Json), astFindings (Json), verifiedBuildResult (Json), stealthSeniorDetected (Boolean) | Opt-in; no signature proof required; format validation only. Extended with AST findings and build verification result. |
| CandidateSignals | 34 GitHub signal fields (Float?), 25 Web3 signal fields (Float?), fraudScore, fraudTier, airdropFarmerDetected (Boolean), stealthSeniorDetected (Boolean), dataCoveragePercent, ecosystemCohort, behaviorPattern, confidenceTier, riskLevel, peakCareerScore, recentScore, trendSignal, ecosystemPercentile, pillar* (Float?), web3SubPillar* (Float?), notObservable (Json) | Central signal cache. All computed signals stored here per dev. |
| DeveloperSnapshot | role, roleConfidence, seniority, seniorityConf, summary, riskLevel, decisionSignal, stealthSeniorBadge (Boolean), generatedAt | First-class CV replacement object (ADR-013). Not derived on every request. |
| CareerTimeline | phases (Json), trajectory, gapEvents (Json), peakWindow (Json), contextInference (Json), onChainMilestones (Json) | Evidence-based career reconstruction. `onChainMilestones` adds TVL milestones and mainnet deployment dates for Web3 candidates. |
| CandidateClaim | claimType, claimKey, description, supportingSignals (Json), evidenceLinks (Json), confidence, isActive | Human-readable claims backed by specific PRs/commits/repos/on-chain transactions |
| Job | tenantId, roleType, seniorityLevel, isWeb3Role (Boolean), web3EcosystemFocus, requiredSignals (Json), weightOverrides (Json), parsedRequirements (Json), dynamicWeights (Json), technologyStack, collaborationWeight, ownershipWeight, temporalWeightConfig (Json) | Read-only stub — HR team owns CRUD in same DB. JD parsing fields added in v5. |
| Application | tenantId, jobId, candidateId, status, decisionCard (Json), gapReport (Json), capabilityStatements (Json), confidenceEnvelope (Json), behaviorPattern, temporalProfile (Json), percentileProfile (Json), web3Profile (Json), roleFitScore, fitTier, fraudTier, stealthSeniorDetected (Boolean), contestation (Json), contestationStatus | Apply-time frozen scorecard. Web3 profile snapshot frozen alongside all other data. |
| HireOutcome | tenantId, applicationId, wasHired, performanceRating (1–5, at 90d), behaviorPatternAtDecision, temporalProfileSnapshot (Json), capabilityStatementsAtDecision (Json), confidenceAtDecision, roleFitScore, pillarScores (Json), web3PillarScoreAtDecision (Json) | Feedback loop root. Validates capability statements predict job performance. |
| PlatformPrior | behaviorPattern, hireRate, avgPerformance90d, sampleSize, computedAt | Cross-client transfer learning prior. Recomputed monthly from anonymised aggregate. |
| RoiSnapshot | orgId, periodStart, periodEnd, avgScreenMin, interviewOfferRatio, timeToFirstDecision, costDelta | Client-facing ROI metrics. Cold-start shows industry benchmarks when < 5 applications. |
| FairnessReport | orgId, quarter, reportPdf (Bytes), flagCount, generatedAt | Quarterly disparate impact report for EEOC/GDPR compliance. |
| BenchmarkCohort | cohortKey, pillarDistributions (Json), web3SubPillarDistributions (Json), sampleSize (min 200), computedAt | Percentile scoring reference. 25+ cohorts at launch. |
| AuditLog | tenantId?, entityType, entityId, action, actorId?, before (Json), after (Json), timestamp | Immutable audit trail. Required for contestation and GDPR DPA compliance. |

---

# 10. Outcome Learning & Transfer Learning

> **Design Principle:** The feedback loop does not automatically update scoring weights — that would risk gaming and unpredictable score drift. Instead, it accumulates outcome data reviewed by the Colosseum team quarterly and used to produce a new calibrated weight matrix. Weights change through a deliberate, reviewed process, not autonomously (ADR-025).

## 10.1 Cross-Client Transfer Learning (Cold-Start Solution)

| Stage | Mechanism |
|---|---|
| 0–15 outcomes | 100% platform prior: BehaviorPattern → hire rate and 90-day performance correlation, computed across all orgs with ≥ 15 outcomes, anonymised and aggregated. Synthetic calibration data used at launch. |
| 15 outcomes | 50% org-specific / 50% platform prior. Weight begins shifting toward org data. Clients see calibration status in their analytics. |
| 50 outcomes | 80% org-specific / 20% prior. Org data now dominates. Prior prevents calibration from drifting on small samples. |
| 100+ outcomes | 100% org-specific. Transfer learning has served its purpose. Org data is statistically significant on its own. |

Privacy: Platform prior computation uses only anonymised BehaviorPattern + outcome pairs. No applicant PII is included. Organisations may opt out of contributing to the prior while still receiving bootstrap calibration from it.

## 10.2 Calibration Analytics

- BehaviorPattern → hire rate and avgPerformanceRating per pattern (requires ≥ 15 outcomes per pattern)
- Temporal trajectory → 90-day performance correlation (validates CareerPhaseEngine assumptions)
- Confidence envelope validation: LOW confidence evaluations should show higher outcome variance than FULL
- Pillar score → performance correlation: identifies which pillars are actually predictive vs. overweighted
- Web3 sub-pillar → performance correlation: validates whether architectural depth or economic impact signals are more predictive for Web3 roles
- Role classification accuracy: how often does inferred role match actual hired role?
- Decision Card accuracy: PROCEED decisions resulting in hire + strong performance validate the Decision Card
- Stealth Senior accuracy: tracking whether STEALTH_SENIOR flagged candidates perform well when hired

## 10.3 ROI Dashboard

| Metric | Target | How Computed |
|---|---|---|
| avgScreenTimeMinutes | < 8 min | Mean HR time per application before first decision, from Application timestamps |
| interviewToOfferRatio | 2.5:1 (vs. 4:1 baseline) | Interviews conducted / accepted offers from HireOutcome data |
| timeToFirstDecisionDays | < 5 days | Calendar days from application created to first pass/reject action |
| estimatedCostPerHireDelta | Positive | HR hourly rate × screen time reduction + interview-to-offer improvement |

## 10.4 Fairness & Disparate Impact Reporting

- Pass/reject rate by visibility tier: FULL vs. PARTIAL vs. LOW vs. MINIMAL. Flags statistically significant differences (Fisher's exact test, p<0.05).
- Pass/reject rate by career gap presence: `careerGapDetected=true` vs. false. Expected to be neutral given gap protection; report confirms this.
- Score distribution by ecosystem cohort: checks that no cohort is systematically scored below median without a corresponding percentile explanation.
- Stealth Senior flagging rate by ecosystem: monitors whether STEALTH_SENIOR detection operates evenly across Web3 sub-ecosystems.
- Contestation rate and resolution: volume, outcome breakdown, and time-to-resolution. High contestation rates on a specific signal trigger an internal review flag.

---

# 11. Commercial Layer & ATS Integration

## 11.1 Native ATS Connectors

| Direction | Greenhouse | Lever | Workday |
|---|---|---|---|
| Pull (inbound) | Applicant metadata, resume, stage | Candidate profile, tags, stage | Worker requisition, applicant record |
| Push (outbound) | roleFitScore, confidenceLabel, gapReport as scorecard, web3SubPillarScores | Score tag, gap summary, interview brief link, Web3 vetting section flag | Custom field: ColossScore, ConfidenceTier, Web3Verified |
| Trigger | Webhook on stage change | Webhook on application create | Polling + webhook fallback |
| Auth | OAuth 2.0 + API key | OAuth 2.0 | OAuth 2.0 + Workday SOAP fallback |

## 11.2 Multi-Tenancy Architecture

- Org-scoped RLS: every Application, HireOutcome, Job, and calibration record carries an `orgId`. Postgres RLS policies enforce queries only return rows matching the authenticated organisation's ID.
- Signal pipeline isolation: BehaviorPattern and TemporalProfile computations run in org-scoped Prisma contexts. No cross-org data leakage path exists in the query layer.
- Admin override: ADMIN-scoped JWTs can query across orgs only for anonymised calibration aggregation. No PII is included in cross-org queries.
- GDPR DPA support: per-org retention periods. `DELETE /api/admin/orgs/:orgId` permanently removes all applicant data for an org on DPA termination.

## 11.3 Candidate Contestation Workflow (GDPR Article 22)

| Step | Actor | Action |
|---|---|---|
| 1. Flag | Candidate | In self-gap view: selects specific caveat or signal + written explanation (e.g. "Career gap Aug 2023–Feb 2024 was parental leave") |
| 2. Notification | System | Contestation appears as review item in HR applicant detail view with candidate's explanation and flagged caveat |
| 3. Resolution | HR | Mark as REVIEWED, ACTIONED (manual score override), or DISMISSED (with required reason). All three stored in AuditLog. |
| 4. Notification | System | Candidate notified of outcome (reviewed/actioned/dismissed) — not internal HR reasoning |
| 5. Rescore | System | If ACTIONED → enqueue rescore with corrected signal value |

---

# 12. Environment Variables

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

DATABASE_URL=postgresql://colosseum:password@localhost:5432/colosseum
REDIS_URL=redis://localhost:6379

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
GITHUB_SYSTEM_TOKEN=            # headless scorecard preview

JWT_SECRET=                     # min 64-char
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_ISSUER=colosseum-api
JWT_AUDIENCE=colosseum-client

ENCRYPTION_KEY=                 # 32-byte hex: openssl rand -hex 32
INTERNAL_API_KEY=               # min 32-char

EVM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<key>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# No ETHERSCAN_API_KEY — Solana uses RPC-native methods only
# No DEFILLAMA_API_KEY — DeFiLlama public API requires no key

RESEND_API_KEY=
RESEND_FROM=noreply@colosseum.dev

SENTRY_DSN=
ANTHROPIC_API_KEY=              # JD parser

DOCKER_SOCKET_PATH=/var/run/docker.sock   # for solana-verify sandbox (ADR-050)
```

---

# 13. Verification Plan

| Stage | Test Target | Pass Condition | Version |
|---|---|---|---|
| 1 | Auth full chain | OAuth → full chain created; ACTIVE; JWT issued; RLS enforced | v4 |
| 2 | Firewall | Firewall zeroes correctly; BehaviorClassifier patterns; headless preview returns GapReport | v4 |
| 2 | Minimum sample thresholds | Developer with 3 PRs: prAcceptanceRate excluded; pillar confidence reduced; HR sees "insufficient PR history" note | v5 |
| 2 | Consistency validator | High prAcceptanceRate + high changeRequestFrequency → dataCoverageNote added to GapReport | v5 |
| 2 | DataCompletenessEngine — LOW visibility | 3 public repos: weights rebalanced; VisibilityTier=LOW; completenessNote shown; overallConfidence < 0.65 | v6 |
| 2 | Dynamic weight rebalancing | Excluded pillars removed from denominator; rebalancedWeights sum to 1.0 ± 0.01; no pillar zeroed | v6 |
| 2 | ConfidenceEnvelope — MINIMAL tier | < 25% signals evaluable: overallConfidence capped at 0.45; hrLabel = "Low — validate manually"; caveats non-empty | v6 |
| 2 | BehaviorClassifier — REVIEW_HEAVY_SENIOR | reviewDepth > 0.7 and reviewCount/commitCount > 0.4: primaryPattern=REVIEW_HEAVY_SENIOR; confidence > 0.65 | v6 |
| 2 | TemporalScoreLayering — career gap detection | 8-month gap: careerGapDetected=true; longestGap="8 months"; careerGapNote populated; roleFitScore unchanged | v6 |
| 2 | TemporalScoreLayering — RETURNING trajectory | Strong history + 6-month gap + recent resumption: trajectory=RETURNING; historicalStrength weighted at 0.65 | v6 |
| 2 | Fraud → confidence (not score) | FraudTier.LIKELY_FRAUDULENT: overallConfidence reduced ≥ 45%; roleFitScore unchanged; WARNING caveat added | v6 |
| 2 | Signal dominance cap | GitHub signals would contribute 65%: cap enforced at 40%; excess redistributed; distribution shown in confidence panel | v6 |
| 2 | New GitHub signals — Web3 collaboration | coreProtocolPrMerges counts only whitelisted repos; securityKeywordReviewDepth detects "reentrancy" in review body; prestigeForkToPrRatio excluded when fewer than 3 prestige forks | v6 |
| 3 | Web3 full chain | ContractAttributor; Solana RPC adapter with mock RPC; wallet registration → signal compute | v4 |
| 3 | Web3 AST adapter — PDA detection | Rust repo with find_program_address: pdaDerivationPattern detected; repo without: signal = 0 | v7 |
| 3 | Web3 AST adapter — CPI detection | Repo with invoke call to Jupiter program ID: cpiComposition signal detected | v7 |
| 3 | Lindy TVL — DeFiLlama integration | Mock DeFiLlama response with $2M TVL for 8 months: lindyTvl = 1.0; DeFiLlama unavailable: signal excluded not zeroed | v7 |
| 3 | Multisig signer detection | Wallet with Squads multisig membership: multisigSigner signal = 1; wallet without: signal = 0 | v7 |
| 3 | Airdrop farmer → confidence (not score) | High-volume low-value txns, zero deployments: airdropFarmerDetected=true; overallConfidence reduced; roleFitScore unchanged | v7 |
| 3 | Stealth Senior override | dataCoveragePercent < 40% AND wallet upgrade authority with $2M volume: stealthSeniorDetected=true; scoreWithheld=false; visibilityTier=PARTIAL | v7 |
| 3 | Verified Build Match — async | POST wallet submission → verifiedBuildResult=PENDING; Docker job completes → verifiedBuildResult=MATCH or MISMATCH; scorecard rescored | v7 |
| 3 | Web3 sub-pillar weights sum correctly | Web3 pillar 20% additive; internal sub-pillar weights: 35+40+15+10=100%; total score weights sum to 1.0 | v7 |
| 4 | JD parser | JD with "lead a team, set technical direction" → collaborationWeight=HIGH, ownershipWeight=HIGH with confidence > 0.80 | v5 |
| 4 | JD parser — Web3 role detection | JD with "Anchor, Solana, mainnet deployment" → isWeb3Role=true; web3EcosystemFocus=SOLANA | v7 |
| 4 | Dynamic weights | Job with parsed JD generates different pillar weights than identical job without JD | v5 |
| 4 | Technology matching | JD requires TypeScript; candidate has no TypeScript repos → TypeScript in technologyFit.missing, TF score reduced | v5 |
| 4 | Gap analysis | Candidate below reviewDepth threshold → gap in GapReport with severity=SIGNIFICANT, hrExplanation populated, interviewProbe generated | v5 |
| 4 | Web3 technical vetting probes | WEB3_SPECIALIST candidate with pdaDerivationPattern gap → PDA probe in interview brief; probe not present for non-Web3 candidate | v7 |
| 4 | Web3 interview brief PDF | POST /interview-brief for WEB3_SPECIALIST → PDF contains "Web3 Technical Vetting" section with relevant signal-gap probes | v7 |
| 4 | Dealbreaker detection | Candidate below hard gate → dealbreakers[] populated; overallVerdict=UNLIKELY_FIT | v5 |
| 4 | Candidate self-gap view | GET /api/me/gap-preview?jobId=X: sees own strengths and gaps; no interview probes in response | v5 |
| 4 | Pattern-aware gap severity | REVIEW_HEAVY_SENIOR with low commitConsistencyScore: displayed severity=MINOR with mitigating context. Same gap for COMMIT_HEAVY_MIDLEVEL displays SIGNIFICANT. | v6 |
| 4 | Per-job temporal weight config | Job with recentWeight=0.70: recentActivityScore weighted at 70% in roleFitScore; confirmed via PATCH round-trip | v6 |
| 4 | Apply determinism | Same input → identical roleFitScore; DecisionCard deterministic; contestation lifecycle | v4 |
| 5 | Outcome collection | POST /outcome with wasHired=true, performanceRating=4 → HireOutcome created; AuditLog entry | v5 |
| 5 | Calibration analytics | Admin GET /calibration/outcomes returns rank correlation, gap accuracy, pillar contribution data for orgs with ≥ 10 outcomes | v5 |
| 5 | HireOutcome behavioral snapshot | POST /outcome: HireOutcome created with behaviorPatternAtDecision, temporalProfileSnapshot, confidenceAtDecision, web3PillarScoreAtDecision captured | v6 |
| 5 | Load test | 100 concurrent apply events; p95 < 2.5s; 0 failed jobs; memory profile stable | v4+ |
| 6 | Multi-tenancy load test | 20 concurrent orgs; RLS isolation verified under load | v7 |
| All | Coverage | ≥ 80% coverage via jest --coverage | v4+ |

CI on every PR: `lint → tsc --noEmit → prisma validate → jest → jest:e2e`

---

# 14. 24-Week Development Roadmap

> **Principle:** Each stage ships working, testable, independently deployable code. Stage 3 has been extended from 3 weeks to 4 weeks to accommodate the Web3 AST adapter, economic impact signals, and Stealth Senior detection. All other stages shift by one week accordingly. All v6 deliverables are preserved in full.

---

## Stage 1 — Foundation (Weeks 1–2)

- `nest new colosseum-api --strict`; `"module": "commonjs"` in tsconfig
- Zod env schema (fail at startup); Docker Compose (pg15 + redis7)
- Full Prisma schema with ALL models including DeveloperSnapshot, CareerTimeline, PlatformPrior, RoiSnapshot, FairnessReport, AuditLog, BenchmarkCohort, Organisation + multi-tenant fields; Web3Profile extended with `astFindings`, `verifiedBuildResult`, `stealthSeniorDetected`
- PostgreSQL RLS policies + Prisma middleware (`SET LOCAL app.tenant_id`)
- PrismaService, RedisService singletons
- Global: helmet, nestjs-pino, @nestjs/throttler, ZodValidationPipe, CORS
- AuthModule: passport-github2 → upsert User (ACTIVE) → Candidate → DeveloperCandidate → GithubProfile (AES-256-GCM); JWT 15m + refresh 7d Redis
- GET /health; GitHub Actions CI

**Deliverable: OAuth → full user chain created; JWT issued; RLS enforced.**

---

## Stage 2 — Core Scoring Pipeline (Weeks 3–6)

- `crypto.util.ts` — AES-256-GCM encrypt/decrypt
- GithubAdapterService — Octokit REST + GraphQL + Events API; Redis cache 24h; rate-limit backoff
- BullMQ: all queues registered (github-sync, signal-compute, web3-ast, verified-build, rescore, notification, ats-sync, prior-calc)
- GithubSyncProcessor — full ingestion; syncProgress milestones; on:complete enqueue signal-compute
- FirewallService — 8 fraud rules + HackathonDetector whitelist + AirdropFarmerFilter
- SignalEngineService — 34 GitHub signals across 6 pillars including the 4 new Web3-aware GitHub signals (coreProtocolPrMerges, securityKeywordReviewDepth, prestigeForkToPrRatio, languageEvolutionTrajectory); minimum sample thresholds enforced; ConsistencyValidator
- DataCompletenessEngine — dataCoveragePercent; VisibilityTier; dynamic pillar weight rebalancing
- PrivacyAdjustmentEngine — Events API private employer months → verifiedPrivateMonths
- BehaviorClassifier — 7 patterns with confidence %; accuracy disclosure injected until n≥200
- CareerPhaseEngine — gap detection (> 90 days); peak-career window (best 24m); trajectory
- EcosystemNormaliser — 9 cohorts at launch (25+ target including Rust/Solana Web3)
- TemporalScoreLayering — peak / recent / trend; career gap detection; RETURNING trajectory handling
- PercentileCalculator — Redis sorted sets; percentileLabel string
- ConfidenceEnvelopeBuilder — tier → Risk Level → hrLabel; score withheld if coverage < 40%; fraud → confidence (not score)
- Signal dominance cap enforcement (40% per category)
- PlatformPrior bootstrap with synthetic calibration data for launch
- CapabilityTranslator — signals → CapabilityStatement[]; gaps → GapStatement[]
- DeveloperSnapshotBuilder — writes DeveloperSnapshot model
- CareerTimelineReconstructor — writes CareerTimeline model
- ClaimGenerator — 10 templates → CandidateClaim[]
- SignalComputeProcessor — orchestrates full pipeline
- ScorecardService — computeForCandidate() + previewForUsername()
- POST /api/scorecard/preview (headless, X-Internal-Key)
- POST /api/me/github/sync (24h throttle); GET .../status

**Deliverable: Full sync pipeline. 34 GitHub signals, DeveloperSnapshot, CareerTimeline, ConfidenceEnvelope all persisted. Headless preview works.**

---

## Stage 3 — Web3 Layer (Weeks 7–10)

> Stage 3 is now 4 weeks. Week 7 is the original foundation. Weeks 8–10 are new.

### Week 7 — Web3 adapter foundation

- POST /api/me/web3/profile — EVM checksum + Solana base58 validation; upsert Web3Profile
- Web3AdapterService — `viem` EVM public client; `@solana/web3.js` Connection; Redis cache TTL 7d
- Solana RPC signals: `getDeployedPrograms`, `getSPLTokenActivity`, `getMetaplexActivity`, `getStakingInteraction`
- ContractAttributor — EVM: Sourcify author check → ABI hash × GitHub repo → org membership fallback
- Web3SignalEngineService — foundation; computes basic web3Signals JSONB + pillarWeb3
- WEB3_SPECIALIST BehaviorPattern integration (basic)
- Web3 signal dominance cap applied (no more than 40% of total)
- 5 WEB3 claim templates; integrate Web3 into SignalComputeProcessor

### Week 8 — Architectural depth signals (AST adapter)

- `web3-ast-adapter` service: clones Rust/Anchor repos to temp directory; runs AST analysis pass
- Detects: pdaDerivationPattern, instructionDiscriminators, accountReallocation, idempotencyLogic, cpiComposition
- web3-ast BullMQ processor: parallel to main signal-compute; results merged with timeout
- LUT usage detection from wallet RPC (versioned transactions with address lookup tables)
- All 7 Pillar 1 (Architectural Depth) signals live

### Week 9 — Economic impact signals

- DeFiLlama API integration — lindyTvl time-weighted signal; excluded when API unavailable (ADR-049)
- Squads Protocol multisig signer check — `getSquadsMultisigMembers` RPC call
- Mainnet upgrade cycle detection — Buffer account creation/deployment pattern
- Crank/keeper uptime — high-frequency bot wallet activity pattern
- IDL on-chain presence — canonical Anchor IDL account check
- Verified Build Match — async Docker-sandboxed `solana-verify` job (ADR-050); `verified-build` processor; result stored separately; rescores when complete
- Airdrop Farmer firewall extension — confidence penalty, not score penalty, consistent with ADR-004
- Stealth Senior detection (ADR-047) — integrated into ConfidenceEnvelopeBuilder; overrides MINIMAL tier

### Week 10 — Ecosystem recognition + full integration

- Social graph weighted PageRank for ecosystemRecognition signal — curated seed list of Solana founders/contributors; GitHub GraphQL follower queries; 7-day Redis cache
- Full Web3SignalEngineService — all 25 signals integrated across 4 sub-pillars
- WEB3_SPECIALIST BehaviorPattern updated with new signals (PDA, CPI, TVL, multisig)
- Web3 sub-pillar weight distribution applied (35/40/15/10 per section 5.6)
- GET /api/hr/applications/:appId/web3 endpoint
- Web3 Technical Vetting probes added to InterviewProbeLibrary (section 6.4)
- Rust/Solana Web3 ecosystem cohort added to EcosystemNormaliser

**Deliverable: Full Web3 pipeline. 25 on-chain signals scored. Stealth Senior detection live. Verified Build Match async job running. Web3 vetting probes in interview library.**

---

## Stage 4 — CV Replacement & Decision Layer (Weeks 11–14)

- DecisionCardGenerator — PROCEED / REVIEW / REJECT + top 3 strengths + top 3 risks from GapReport
- GapAnalysisEngine — DEALBREAKER / SIGNIFICANT / MINOR severity; mitigating context; pattern-aware gap severity adjustment; Web3 signal gap handling
- InterviewProbeLibrary — STAR-format questions (severity-gated + Unknowns-driven); Web3 Technical Vetting probes per section 6.4; mandatory for DEALBREAKERs + all Unknowns; optional for MINOR
- JobDescriptionParser — Anthropic API integration; extracts ParsedJobRequirements including `isWeb3Role` and `web3EcosystemFocus`; HR confirmation step before saving
- Dynamic weight generation from ParsedJobRequirements; TechnologyMatchingService (cross-references JD tech stack including Web3 tooling against languageDistribution)
- JobsModule (read-only) — GET /api/jobs, GET /api/jobs/:id, GET .../fit, PATCH .../temporal-config
- RoleFitEngineService — compute(signals, job): GapReport; pure deterministic; applies Web3 sub-pillar weights when `isWeb3Role=true`
- ApplicationsModule — POST /api/jobs/:id/apply: guard ACTIVE + DONE + no duplicate → run RoleFitEngine + DecisionCardGenerator → freeze
- HR Application Views: list with DecisionCard + Snapshot + Stealth Senior badge; full detail with GapReport + Web3 signal detail + vetting probes + not-observable list
- ConfidenceEnvelope colour-coded badge on all applicant cards; LOW tier → modal prompt before advancing
- HR decision actions: SHORTLIST / REJECT / FLAG / REQUEST_INFO → AuditLog; bulk update; side-by-side compare (up to 4)
- Contestation workflow (GDPR Article 22): POST .../contest; PATCH .../contest/resolve → AuditLog; if ACTIONED → enqueue rescore
- Interviewer brief PDF — puppeteer render; 45-min guide; Snapshot + Timeline + Web3 vetting section + probes + scoring rubric; triggered on SHORTLIST
- Candidate self-gap view — GET /api/me/gap-preview?jobId=:id — sees own gaps without interview probes
- BehaviorPattern accuracy disclosure added to applicant detail UI; pattern confidence shown alongside hrLabel
- Rescore queue — triggered on weightOverrides or temporalConfig change or verifiedBuildResult update

**Deliverable: Full CV replacement loop. HR sees DecisionCard first. Web3 Technical Vetting section in interview brief. STAR-format probes live.**

---

## Stage 5 — Outcomes, ROI & Fairness (Weeks 15–17)

- HireOutcome — POST /api/outcomes; capture full behavioral + temporal + web3 sub-pillar snapshot at decision time
- PlatformPrior recompute (monthly cron) — anonymised BehaviorPattern→performance aggregate; priorBlendRatio per org
- Calibration analytics — behavior-outcome + trajectory-outcome + web3-subpillar-outcome correlation views
- Stealth Senior accuracy tracking in calibration analytics
- ROI dashboard — GET /api/hr/orgs/:orgId/roi; cold-start shows industry benchmarks
- Fairness report — GET /api/hr/orgs/:orgId/fairness-report; Fisher's exact test p<0.05; PDF via puppeteer; includes Stealth Senior flagging rate by ecosystem
- GDPR deletion DELETE /api/me — hard delete dev data including Web3Profile; soft anonymize applications; flush Redis; AuditLog
- GDPR Article 22 verification — contestation resolution within 5-day SLA; AuditLog immutability enforced
- @sentry/node initialized; correlationId via AsyncLocalStorage; BullMQ duration_ms logging
- Load test (k6): 100 concurrent apply events across full engine stack including Web3 signals; p95 < 2.5s
- Remaining BenchmarkCohort population (target: 25+ cohorts including Rust/Solana Web3)

**Deliverable: Feedback loop live. GDPR compliant. Fairness reporting including Web3 fairness metrics. ROI dashboard. Outcome learning operational.**

---

## Stage 6 — ATS & Commercial (Weeks 18–21)

- ATS connectors — Greenhouse (OAuth 2.0, two-way), Lever (OAuth 2.0, two-way), Workday (OAuth/SOAP push); no API key-only auth (ADR-039); Web3 fields pushed to ATS custom fields
- POST /api/hr/orgs/:orgId/ats/connect — OAuth flow completion
- POST /api/hr/orgs/:orgId/ats/sync — manual sync trigger; GET .../sync/:syncJobId — status + record counts
- Connector test suite (mock ATS responses)
- Multi-tenancy load test: 20 concurrent orgs; RLS isolation verified under load
- GDPR DPA endpoint (DELETE /api/admin/orgs/:orgId) — permanently removes all applicant data for org on DPA termination
- Competitive positioning document produced (non-engineering deliverable)
- E2E test suite: contestation → fairness report → ATS sync → ROI → DecisionCard accuracy → Web3 vetting flow → full engine stack

**Deliverable: ATS-integrated commercial product. Multi-tenant verified. Commercially ready.**

---

# 15. Success Metrics

| Metric | Target | What It Validates |
|---|---|---|
| Developer agreement rate: % who agree their scorecard is fair | > 80% in 30d | Fairness mechanisms and confidence transparency are working |
| Hiring manager time-to-shortlist | 50% reduction | Decision layer outputs are actionable without additional investigation |
| HR screening call conversion: % who pass technical interview | > baseline | Scorecard predicts real ability, not just CV quality |
| Average screen time per application | < 8 minutes | HR-readable outputs and inline decision actions eliminate context-switching |
| Profile share rate: % who actively share Colosseum profile | > 40% | Candidates perceive the profile as a net positive CV replacement |
| Return recruiter rate: % of HR users who run a second search within 30 days | > 70% | Product is genuinely useful to the hiring side, not just a novelty |
| Confidence envelope validation: HIGH RISK has higher outcome variance than LOW RISK | Statistically significant | The confidence system is calibrated — it accurately signals uncertainty |
| Contestation resolution rate: % resolved within 5 business days | > 95% | GDPR Article 22 workflow is operational and HR teams are engaging with it |
| Decision Card accuracy: PROCEED → hire + ≥3 performance rating at 90 days | > 70% | Decision Cards predict hiring success, not just signal strength |
| Stealth Senior accuracy: % of STEALTH_SENIOR flagged candidates who perform well when hired | > 65% | The Stealth Senior override is identifying real talent, not generating false positives |
| Web3 vetting probe hit rate: % of WEB3_SPECIALIST interviews where at least one probe uncovers a gap | > 50% | Web3 technical vetting probes are surfacing meaningful signal in the interview |

> **The Honest Ceiling**
>
> A 10/10 hiring tool would correctly predict developer performance in every context. That ceiling is not achievable from GitHub and on-chain signals alone, and claiming otherwise would be dishonest. The system cannot assess system design thinking, communication quality, cultural alignment, or management capability. For Web3 candidates, it cannot assess protocol design reasoning, economic security thinking, or key management practices beyond what is directly observable. The ScorecardCaveat layer and the Unknowns section make this clear in every output. A system that is honest about its limits and accurate within them is more valuable than one that overclaims. The path from launch quality to a 9.5+ system runs through client adoption, real outcome data, and ML-validated pattern detection — not additional pre-launch engineering.