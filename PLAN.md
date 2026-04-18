# COLOSSEUM

## Table of Contents

- [0. Core Thesis](#0-core-thesis)
- [1. Tech Stack](#1-tech-stack)
- [2. Project Structure](#2-project-structure)
- [3. Architecture](#3-architecture)
  - [3.1 Architecture Decision Records](#31-architecture-decision-records)
  - [3.2 System Architecture Pipeline](#32-system-architecture-pipeline)
- [4. Scoring Model — Capability-Based Engine](#4-scoring-model--capability-based-engine)
  - [4.1 Design Principles](#41-design-principles)
  - [4.2 Signal Set — 8 High-Signal Inputs](#42-signal-set--8-high-signal-inputs)
  - [4.3 Capability Scoring](#43-capability-scoring)
  - [4.4 Ownership Scoring](#44-ownership-scoring)
  - [4.5 Impact Scoring](#45-impact-scoring)
  - [4.6 Confidence — Inline Modifier, Not a Peer Score](#46-confidence--inline-modifier-not-a-peer-score)
  - [4.7 Data Completeness & Visibility](#47-data-completeness--visibility)
  - [4.8 What Was Removed and Why](#48-what-was-removed-and-why)
- [5. Output Format](#5-output-format)
  - [5.1 Result Schema](#51-result-schema)
  - [5.2 AnalysisJob Entity](#52-analysisjob-entity)
  - [5.3 Recruiter Card — Example Output](#53-recruiter-card--example-output)
- [6. Job Processing Pipeline](#6-job-processing-pipeline)
  - [6.1 Queue Stages](#61-queue-stages)
  - [6.2 Data Fetcher — Lightweight Only](#62-data-fetcher--lightweight-only)
  - [6.3 Caching Strategy](#63-caching-strategy)
- [7. API Contract](#7-api-contract)
  - [7.1 Analysis](#71-analysis)
  - [7.2 Auth & User](#72-auth--user)
- [8. Web3 / Solana Integration](#8-web3--solana-integration)
  - [8.1 Wallet Signal Design](#81-wallet-signal-design)
  - [8.2 Unified Scoring Layer](#82-unified-scoring-layer)
- [9. Key Database Models](#9-key-database-models)
- [10. Environment Variables](#10-environment-variables)
- [11. Verification Plan](#11-verification-plan)
- [12. Development Roadmap](#12-development-roadmap)
  - [Stage 1 — Foundation ✅ Complete](#stage-1--foundation--complete)
  - [Stage 2 — Scoring Pipeline Refactor 🔄 In Progress](#stage-2--scoring-pipeline-refactor--in-progress)
  - [Stage 3 — Web3 / Solana Layer](#stage-3--web3--solana-layer)
  - [Stage 4 — CV Replacement & Decision Layer](#stage-4--cv-replacement--decision-layer)
  - [Stage 5 — Outcomes, ROI & Fairness](#stage-5--outcomes-roi--fairness)
  - [Stage 6 — ATS & Commercial](#stage-6--ats--commercial)
- [13. Success Metrics](#13-success-metrics)

---

# 0. Core Thesis

> **The Fundamental Shift**
>
> A CV is a claim. Colosseum is evidence. The system replaces traditional CVs with automatically generated proof-of-work profiles derived from real developer activity — requiring zero manual input from the candidate. A developer's GitHub activity contains most of what a hiring decision actually requires: ownership patterns, project longevity, tech stack signals, collaboration breadth, and consistency over time. For Web3 developers, on-chain deployment history, program ownership, and transaction volume add a cryptographic layer of proof that no CV can replicate. The problem is that raw GitHub and on-chain data is noisy, visibility-uneven, and easy to over-engineer into low-signal complexity. Colosseum filters, interprets, and presents that data as a recruiter-ready output — not a dashboard, not a score dump, not an analytics platform.

## The Question the System Answers

> "What has this developer actually done, what are they good at, and how confident are we in this assessment?"

## Structural Problems This Solves

1. CVs are claims — the system replaces them with observable evidence
2. Role-based self-reporting is inaccurate — capabilities are inferred automatically
3. Noisy metrics (commit counts, lines of code) obscure real signal — they are excluded
4. Confidence is often conflated with ability — they are separated per dimension
5. Unequal visibility across candidates (public vs. private work) — data completeness is surfaced as a qualifier, not a penalty
6. Recruiter outputs are not actionable — the system produces a plain-English summary, not a score dump
7. Wallet-based proof of work has no structured home — the schema is designed to absorb Solana signals without redesign

---

# 1. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10, TypeScript 5, `"module": "commonjs"` |
| ORM | Prisma 7 |
| Database | PostgreSQL 15 |
| Cache + Queue | Redis 7 + BullMQ + `@nestjs/bullmq` |
| GitHub Client | `@octokit/rest` + `@octokit/graphql` |
| Auth | `passport-github2` + `@nestjs/jwt` + `passport-jwt` |
| Token Security | Node.js `crypto` AES-256-GCM |
| Web3 (Solana) | `@solana/web3.js` (read-only, RPC-native) — Stage 3 |
| Web3 (EVM) | `viem` (read-only) — Stage 3 |
| Config | `@nestjs/config` + Zod env schema (fail at startup) |
| Validation | `zod` + `nestjs-zod` |
| Security | `helmet`, `@nestjs/throttler` |
| Logging | `nestjs-pino` + `pino-http` |
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
│   ├── analysis/                         # AnalysisJob CRUD, status, result
│   ├── profile/                          # Candidate profile, wallet address
│   └── admin/                            # Queue stats, cache management
│
├── scoring/                              # Pure domain — no HTTP surface
│   ├── github-adapter/                   # Lightweight data fetcher
│   ├── signal-extractor/                 # 8-signal extraction from raw data
│   ├── scoring-service/                  # Capability + Ownership + Impact scoring
│   ├── summary-generator/                # Plain-English summary from top dimensions
│   └── web3-adapter/                     # Stage 3 — Solana + EVM signal fetch
│
├── queues/
│   ├── analysis.processor.ts             # Main pipeline orchestrator
│   ├── rescore.processor.ts              # Manual recompute trigger
│   └── notification.processor.ts
│
└── shared/
    ├── guards/ decorators/ interceptors/
    └── crypto.util.ts
```

---

# 3. Architecture

## 3.1 Architecture Decision Records

| ADR | Decision | Rationale |
|---|---|---|
| ADR-001 | Modular monolith (NestJS modules) | Clean domain boundaries; extract to microservices later without redesign |
| ADR-002 | BullMQ on Redis for async analysis | GitHub data fetch is 3–10s per profile; sync is infeasible |
| ADR-003 | AnalysisJob is the source of truth | Not users, not sessions — the job anchors the entire system |
| ADR-004 | No role-based scoring | Requires user input; self-reports are inaccurate; hybrid developers break classification |
| ADR-005 | Confidence is an inline modifier, not a peer score | A recruiter needs "backend: 82 (high confidence)", not "confidence: 72" as a standalone number |
| ADR-006 | Collaboration is Impact, not a Capability | Collaboration is a behavioral signal. Backend / Frontend / DevOps are technical skills. These are different categories |
| ADR-007 | 8 signals maximum | Diminishing returns beyond this; each additional signal adds noise, maintenance cost, and explainability loss |
| ADR-008 | No deep commit or diff parsing | Commit counts and lines of code are noisy and gameable; contribution graph summary is sufficient |
| ADR-009 | 24h result cache by username | Protects GitHub API rate limits; critical for demo reliability |
| ADR-010 | Output schema locked before scoring logic is written | The schema is the contract; all layers build toward it |
| ADR-011 | Lightweight fetcher only — no deep repo analysis at MVP | Repo list + contribution graph + external PRs covers all 8 signals without deep parsing |
| ADR-012 | Headless analysis API callable without user account | Testing and CI pipelines decouple from the user session layer |
| ADR-013 | Wallet address extends the same job input | No redesign needed when Solana signals are added — same AnalysisJob, same schema |
| ADR-014 | Summary is rule-based at MVP, not AI-generated | Template-driven summaries are consistent, auditable, and fast. AI generation is a Stage 4 enhancement |
| ADR-015 | Progress stages defined before queue implementation | Stages must map 1:1 to UI messages; define them once, use them everywhere |

---

## 3.2 System Architecture Pipeline

```
[ POST /analysis ]
        ↓
[ AnalysisJob created → jobId returned ]
        ↓
[ Cache check — username hit? → return cached result immediately ]
        ↓  (cache miss)
[ BullMQ queue → analysis.processor ]
        ↓
[ GitHub Data Fetcher (lightweight) ]
  · User profile
  · Repo list: name, language, stars, forks, topics, created_at, pushed_at, is_fork
  · Contribution graph (weekly summary, not per-repo)
  · External PR contributions (count + repo names only)
        ↓
[ Signal Extractor — 8 signals ]
  S1 Ownership depth
  S2 Project longevity
  S3 Activity consistency
  S4 Tech stack breadth
  S5 External contributions
  S6 Project meaningfulness
  S7 Stack identity
  S8 Data completeness
        ↓
[ Scoring Service ]
  · Capabilities (Backend / Frontend / DevOps) ← S4, S7
  · Ownership (owned projects, maintained)      ← S1, S2
  · Impact (activity, consistency, external)    ← S3, S5, S6
  · Confidence modifier applied inline per dim  ← S8
        ↓
[ Summary Generator — plain-English 1–2 sentence description ]
        ↓
[ Result stored → cache set → job marked complete ]
        ↓
[ GET /analysis/:jobId/result ]

— Stage 3 extension —
[ Solana / EVM Fetcher runs in parallel at data fetch layer ]
[ Same scoring layer — same output schema ]
```

---

# 4. Scoring Model — Capability-Based Engine

## 4.1 Design Principles

- **Capability-based, not role-based.** Strengths are inferred automatically. The user selects nothing.
- **Describe, do not classify.** Output strengths and patterns. Do not force a developer into a single label.
- **High-signal only.** Ownership, project longevity, consistency, and meaningful contributions. Not commit counts, lines of code, or repo complexity.
- **Simple and explainable.** 8 signals. Every score must be explainable in one sentence.
- **Confidence as a modifier.** Confidence qualifies each dimension inline. It is not a separate dimension alongside capabilities, ownership, and impact.
- **Fast and scalable.** No deep repo parsing at MVP. Lightweight fetcher only.
- **Wallet-compatible.** Schema designed now to absorb Solana signals in Stage 3 without structural change.

---

## 4.2 Signal Set — 8 High-Signal Inputs

| # | Signal | Computed From | Why It Matters |
|---|---|---|---|
| S1 | Ownership depth | Non-fork repos owned, maintained > 3 months | Distinguishes real work from clones and toy experiments |
| S2 | Project longevity | Average age of actively maintained repos | Signals commitment vs. short-lived projects |
| S3 | Activity consistency | Contribution graph: active weeks / 52 | Sustained pattern of work over time — not raw commit volume |
| S4 | Tech stack breadth | Unique languages across owned repos | Generalist vs. specialist; feeds capability inference |
| S5 | External contributions | PRs merged into repos not owned by user | Collaboration quality and real-world credibility |
| S6 | Project meaningfulness | Stars + forks + topic tags on owned repos | Evidence that others found the work useful |
| S7 | Stack identity | Top 2 languages by repo count and bytes written | Primary build environment — primary driver of capability scoring |
| S8 | Data completeness | Public repo count, contribution visibility, account age | Confidence modifier applied inline to each dimension |

---

## 4.3 Capability Scoring

Capability scores (0–100) are inferred from S7 (stack identity) and S4 (tech stack breadth). A developer can score high on multiple capabilities — no single label is forced.

| Capability | Primary Language Signals | Secondary Signals |
|---|---|---|
| Backend | Python, Go, Rust, Java, Node.js, PHP, Ruby | API-topic repos, database configs, server-side frameworks |
| Frontend | TypeScript, JavaScript with UI topics, CSS | React/Vue/Svelte/Angular repos, CSS-heavy repos, UI component topics |
| DevOps | Shell, HCL, YAML-dominant repos | Docker, Kubernetes, CI/CD configs, infra topics, Terraform |

Each capability score carries an inline confidence qualifier (`low` / `medium` / `high`) derived from S8. A developer with few public repos gets the same score they earned — but with `confidence: "low"` so the recruiter understands the data picture.

---

## 4.4 Ownership Scoring

Ownership is expressed as counts, not a weighted score. Recruiters can read counts directly; a number from 0–100 adds no value here.

- `ownedProjects` — count of non-fork repos maintained > 3 months (S1)
- `activelyMaintained` — count of repos with a push in the last 6 months (S2)
- `confidence` — derived from S8

---

## 4.5 Impact Scoring

Impact uses qualitative descriptors rather than a 0–100 score. Descriptors communicate more clearly to a recruiter than an arbitrary number.

- `activityLevel` — `high` / `medium` / `low` — from S3 (active weeks / 52)
- `consistency` — `strong` / `moderate` / `sparse` — from S3 trend over time
- `externalContributions` — count of PRs merged into external repos — from S5
- `confidence` — derived from S8

> **Note:** Collaboration (external contributions) sits here under Impact. It is a behavioral signal, not a technical skill. It does not belong in Capabilities alongside Backend / Frontend / DevOps.

---

## 4.6 Confidence — Inline Modifier, Not a Peer Score

Confidence is **not** a top-level dimension alongside Capabilities, Ownership, and Impact. It is a qualifier that travels with each dimension.

```
// Correct
{ "backend": { "score": 82, "confidence": "high" } }

// Incorrect — confidence as a peer score adds nothing
{ "backend": 82, "confidence": 72 }
```

The `confidence` value comes from S8 (data completeness). Factors:
- Public repo count (< 5 → low)
- Account age (< 1 year → low)
- Contribution visibility (sparse graph → medium)
- Profile completeness

Developers with private-heavy work histories are not penalised. They receive accurate capability scores with `confidence: "low"` — which tells the recruiter to weigh accordingly, not that the developer is weak.

---

## 4.7 Data Completeness & Visibility

| Scenario | Behaviour |
|---|---|
| Rich public history (≥ 10 owned repos, active graph) | All signals compute fully; confidence: high across dimensions |
| Mixed (5–9 repos, partial graph) | All signals compute; confidence: medium |
| Sparse public profile (< 5 repos or < 1yr account) | Signals compute from available data; confidence: low; note surfaced to recruiter |
| Zero public data | Job fails gracefully; recruiter shown: "Insufficient public data to generate a profile" |

Private-heavy developers are not scored lower. They are scored on what is visible with an honest confidence qualifier. `privateWorkIndicatorsDetected` (high consistency + sparse public repos) adds a note: "This developer may work primarily in private or enterprise contexts — public signals may underrepresent full capability."

---

## 4.8 What Was Removed and Why

| Removed | Reason |
|---|---|
| Role-based scoring | Requires user input; self-reports are inaccurate; hybrid developers break it; violates zero-effort goal |
| Commit count as primary metric | Gameable; no meaningful correlation with hiring decisions |
| Lines of code | The most gameable metric available; conveys nothing about quality |
| Repo complexity scoring | Expensive to compute; poorly defined; no recruiter interpretability |
| PR/issue micro-metrics (acceptance rates, comment counts) | Simplified into S5 external contributions count |
| Time decay functions | Replaced by S3 activity consistency — simpler and more intuitive |
| Collaboration as a Capability | Collaboration is behavioral; moved to Impact as `externalContributions` |
| Confidence as a top-level score | Restructured as an inline modifier; a standalone "confidence: 72" tells a recruiter nothing |
| Deep commit and diff parsing | Not needed; all 8 signals compute from repo metadata and contribution graph |

---

# 5. Output Format

## 5.1 Result Schema

This schema is locked. All scoring logic builds toward this contract. The same schema is used in Stage 3 when Solana signals are merged — no structural change required.

```json
{
  "summary": "string — 1–2 sentence plain-English description of primary strengths",

  "capabilities": {
    "backend":  { "score": 0, "confidence": "low | medium | high" },
    "frontend": { "score": 0, "confidence": "low | medium | high" },
    "devops":   { "score": 0, "confidence": "low | medium | high" }
  },

  "ownership": {
    "ownedProjects":        0,
    "activelyMaintained":   0,
    "confidence":           "low | medium | high"
  },

  "impact": {
    "activityLevel":         "high | medium | low",
    "consistency":           "strong | moderate | sparse",
    "externalContributions": 0,
    "confidence":            "low | medium | high"
  }
}
```

---

## 5.2 AnalysisJob Entity

The AnalysisJob is the source of truth for the entire system. Not users, not sessions.

```json
{
  "id": "job_abc123",
  "status": "pending | running | completed | failed",
  "input": {
    "githubUsername": "string",
    "walletAddress":  "string (optional — Stage 3)"
  },
  "progress": {
    "stage":      "queued | fetching_repos | analyzing_projects | building_profile | complete",
    "percentage": 0
  },
  "result": { },
  "userId":    "optional — attached on auth",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

---

## 5.3 Recruiter Card — Example Output

```
Alex Chen — GitHub Profile

Backend-focused developer with strong project ownership. Consistently active
across 4 maintained projects, primarily building in Go and Python. Has contributed
to 12 external repositories, indicating real-world collaborative experience.

CAPABILITIES
  Backend   82  ██████████████████░░  high confidence
  Frontend  20  ████░░░░░░░░░░░░░░░░  medium confidence
  DevOps    55  ███████████░░░░░░░░░  medium confidence

OWNERSHIP
  Owned projects: 4   |   Actively maintained: 2   |   Confidence: high

IMPACT
  Activity: high   |   Consistency: strong   |   External contributions: 12
```

---

# 6. Job Processing Pipeline

## 6.1 Queue Stages

Progress stages are defined here and used verbatim in both queue and UI. No divergence.

| Stage | Description |
|---|---|
| `queued` | Job created; waiting in BullMQ queue |
| `fetching_repos` | GitHub adapter fetching user profile and repo list |
| `analyzing_projects` | Signal extractor processing raw data into 8 signals |
| `building_profile` | Scoring service computing capabilities, ownership, impact |
| `complete` | Result stored; cache set; job closed |

---

## 6.2 Data Fetcher — Lightweight Only

The fetcher pulls only what the 8 signals need. No deep analysis.

**Fetched:**
- User profile (account age, public repo count, followers)
- Repo list per repo: `name`, `language`, `stars`, `forks`, `topics`, `created_at`, `pushed_at`, `is_fork`, `description`
- Contribution graph — weekly summary (active weeks count, not per-repo breakdown)
- External PR contributions — count and repo names only; no diffs, no review content

**Not fetched:**
- Commit-level data
- Diff or line-count data
- README or dependency file content
- Per-file language breakdown (repo-level language field is sufficient)

---

## 6.3 Caching Strategy

Before enqueuing, the job service checks the cache:

```
cache.get(`analysis:${githubUsername}`)
  → hit  : return cached result with status: completed immediately
  → miss : enqueue; set cache on completion with TTL 24h
```

Cache is keyed by `githubUsername`. If `walletAddress` is also provided (Stage 3), the cache key extends to include it.

Manual recompute endpoint bypasses cache:
```http
POST /analysis/recompute
Body: { "githubUsername": "...", "force": true }
```

---

# 7. API Contract

## 7.1 Analysis

| Method | Path | Guard | Description |
|---|---|---|---|
| POST | /analysis | Public | Create AnalysisJob. Body: `{ githubUsername, walletAddress? }`. Returns `{ jobId }` |
| GET | /analysis/:jobId/status | Public | `{ status, stage, percentage }` |
| GET | /analysis/:jobId/result | Public | Full result when `status: completed` |
| POST | /analysis/recompute | X-Internal-Key | Force re-analysis bypassing cache |
| POST | /analysis/:jobId/attach | JWT | Attach job to authenticated user |

## 7.2 Auth & User

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | /auth/github | Public | GitHub OAuth redirect |
| GET | /auth/github/callback | Public | Exchange → JWT |
| POST | /auth/refresh | Bearer | Rotate refresh token |
| POST | /auth/logout | JWT | Revoke refresh token |
| GET | /api/me/analyses | JWT | List of jobs attached to authenticated user |
| DELETE | /api/me | JWT | GDPR hard delete |

---

# 8. Web3 / Solana Integration

Designed now. Built in Stage 3. No redesign required when wallet signals are added.

## 8.1 Wallet Signal Design

The job input already accepts `walletAddress`. When provided, the Solana fetcher runs in parallel with the GitHub fetcher at the data layer.

**Solana signals that map to existing dimensions:**

| Solana Signal | Maps To | Dimension |
|---|---|---|
| Deployed programs (upgrade authority) | Owned projects | Ownership |
| Program age | Project longevity (S2) | Ownership |
| Transaction / usage volume | Project meaningfulness (S6) | Impact |
| Mainnet deployments | Activity consistency (S3) | Impact |
| Contributions to core Solana repos | External contributions (S5) | Impact |
| Primary language (Rust, TypeScript anchor) | Stack identity (S7) | Capabilities |

No new top-level dimensions are needed. The schema absorbs wallet data without structural change.

## 8.2 Unified Scoring Layer

```
[ GitHub Signals ]   [ Solana Signals ]
         ↘                ↙
    [ Unified Scoring Layer ]
     Capabilities / Ownership / Impact
     (confidence modifier from both sources)
         ↓
    [ Same result schema ]
    [ Same recruiter card ]
```

When wallet data is present, capability scores may be reinforced (a Rust-heavy GitHub profile + Solana deployed programs → backend: high with higher confidence) or conflict may be noted in the summary.

---

# 9. Key Database Models

| Model | Key Fields | Purpose |
|---|---|---|
| AnalysisJob | id, status, stage, percentage, input (Json), result (Json), userId?, createdAt, updatedAt | Source of truth for every analysis. Anchors the entire system |
| User | id, email, role, accountStatus | Optional; links to attached jobs |
| GithubProfile | githubUsername, encryptedToken (AES-256-GCM), syncStatus, rawDataSnapshot (Json) | GitHub OAuth token encrypted at rest; raw fetch cache |
| Web3Profile | solanaAddress?, evmAddress?, onChainMetrics (Json) | Opt-in; format validation only; no signature proof required |
| CachedResult | cacheKey (username + optional wallet), result (Json), expiresAt | 24h TTL cache; checked before enqueue |

---

# 10. Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `GITHUB_SYSTEM_TOKEN` | System-level token for headless analysis |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | JWT refresh token secret |
| `INTERNAL_API_KEY` | X-Internal-Key for headless scorecard endpoint |
| `SENTRY_DSN` | Sentry error tracking DSN |
| `SOLANA_RPC_URL` | Solana RPC endpoint (Stage 3) |

---

# 11. Verification Plan

| Stage | Test | Expected | Version |
|---|---|---|---|
| 2 | Signal extraction | All 8 signals return valid values for 5 seed usernames | v2 refactor |
| 2 | Capability scoring | Backend/Frontend/DevOps scores correlate with known developer profiles | v2 refactor |
| 2 | Confidence modifier | Developer with < 5 repos returns `confidence: "low"` across all dimensions | v2 refactor |
| 2 | Cache hit | Second request for same username returns immediately without re-queuing | v2 refactor |
| 2 | Cache miss | New username triggers full pipeline and sets cache on completion | v2 refactor |
| 2 | Headless API | POST /analysis with seed username returns correct result schema | v2 refactor |
| 2 | Private-heavy profile | Developer with high consistency + sparse repos gets `confidence: "low"` with private work note | v2 refactor |
| 2 | Zero public data | Pipeline fails gracefully; job status: failed with clear reason | v2 refactor |
| 3 | Wallet signal fetch | Solana RPC returns deployed programs for known wallet address | v3 |
| 3 | Unified scoring | GitHub + Solana signals produce single result in same schema | v3 |
| All | Coverage | ≥ 80% via jest --coverage | all |

CI on every PR: `lint → tsc --noEmit → prisma validate → jest → jest:e2e`

---

# 12. Development Roadmap

> **Principle:** Stages 1 and 2 are built. The roadmap begins with the Stage 2 scoring refactor — a targeted replacement of the scoring layer inside the existing pipeline. Nothing else is being rebuilt. Subsequent stages extend the system progressively.

---

## Stage 1 — Foundation ✅ Complete

- NestJS scaffold, Zod env schema, Docker Compose (pg15 + redis7)
- Prisma schema, PostgreSQL setup, PrismaService and RedisService singletons
- Global: helmet, nestjs-pino, throttler, ZodValidationPipe, CORS
- AuthModule: GitHub OAuth → JWT 15m + refresh 7d Redis
- BullMQ queues registered
- GET /health; GitHub Actions CI

**Deliverable: OAuth complete. JWT issued. Infrastructure stable.**

---

## Stage 2 — Scoring Pipeline Refactor 🔄 In Progress

> This is a refactor, not a rebuild. The API layer, job service, queue infrastructure, and storage are not changing. Only the scoring logic inside the pipeline is being replaced.

### What does not change
- POST /analysis, GET /analysis/:id/status, GET /analysis/:id/result
- BullMQ queue infrastructure and processor structure
- GitHub data fetcher (fields are trimmed, not rewritten)
- Storage layer and result persistence

### Phase 1 — Preparation

- Lock the output schema (Section 5.1) as a TypeScript interface — all downstream code builds to this
- Audit current fetcher output: confirm all fields needed for 8 signals are already fetched; identify any gaps
- Feature-flag existing scoring logic: gate it behind `LEGACY_SCORING=true` env var for safe rollback
- Write signal unit tests with seed usernames before writing any scoring code — define expected output first
- Correct progress stage order: `analyzing_projects` must precede `building_profile` (not the reverse)

### Phase 2 — Signal Extraction Layer

- Build `SignalExtractorService` — takes raw GitHub data, returns typed 8-signal object
- Implement S1 + S2 (Ownership depth and project longevity from repo metadata)
- Implement S3 (Activity consistency from contribution graph weekly summary — not commit count)
- Implement S4 + S7 (Tech stack breadth and stack identity from language fields)
- Implement S5 + S6 (External PRs for collaboration; stars + forks + topics for meaningfulness)
- Implement S8 (Data completeness from repo count, account age, graph visibility — confidence modifier only)

### Phase 3 — Scoring Layer Replacement

- Build `ScoringService` — takes 8-signal object, returns typed result matching locked schema
- Implement capability scoring: Backend / Frontend / DevOps from S7 + S4 with language-to-capability weight map
- Implement ownership scoring: `ownedProjects` and `activelyMaintained` counts from S1 + S2
- Implement impact scoring: `activityLevel`, `consistency`, `externalContributions` from S3 + S5 + S6
- Apply S8 confidence modifier inline to each dimension — not as a separate top-level field
- Implement `privateWorkIndicatorsDetected` note: high S3 consistency + low S8 completeness → surface caveat
- Build `SummaryGenerator` — rule-based 1–2 sentence description from top-scoring dimensions (no AI at MVP)
- Disable `LEGACY_SCORING` flag and remove legacy scoring code once tests pass

### Phase 4 — Cache Layer

- Implement 24h result cache keyed by `githubUsername` — check before enqueue, set on completion
- Add `POST /analysis/recompute` endpoint with `force: true` flag to bypass cache
- Preload 5 seed usernames with cached results for instant demo response
- Verify cache hit returns result immediately without touching the queue

### Phase 5 — Data Fetcher Trim

- Remove commit-level API calls from GitHub adapter — contribution graph weekly summary is sufficient
- Remove diff and line-count fetch — not used in any signal
- Verify repo list includes all required fields: `language`, `stars`, `forks`, `topics`, `created_at`, `pushed_at`, `is_fork`
- Benchmark pipeline time before/after trim — target: < 10s per analysis on cache miss

### Phase 6 — Validation

- End-to-end integration test: run full pipeline on 5 seed usernames; verify result schema matches locked contract
- Manual review of generated summaries and scores for 10 diverse real profiles; adjust language-to-capability weights as needed
- Verify private-heavy profile receives correct confidence qualifiers and caveat note
- Verify zero-public-data profile fails gracefully with clear job failure reason

**Deliverable: Scoring layer fully replaced. 8 signals. Capability + Ownership + Impact with inline confidence. Cache live. Result schema locked and matching contract. Pipeline < 10s.**

---

## Stage 3 — Web3 / Solana Layer

- `POST /api/me/web3/profile` — Solana base58 + EVM checksum validation; upsert Web3Profile
- `Web3AdapterService` — `@solana/web3.js` Connection + `viem` public client; Redis cache TTL 7d
- Solana RPC signal fetch: deployed programs (upgrade authority), SPL token activity, program age, transaction volume
- EVM: ABI hash × GitHub repo match → contract attribution
- Extend `SignalExtractorService` to accept optional wallet signals alongside GitHub signals
- Unified scoring: wallet signals map into existing Capabilities / Ownership / Impact dimensions (see Section 8)
- Extend cache key to include `walletAddress` when provided
- `WEB3_SPECIALIST` context: if Rust is primary language + Solana programs deployed → backend confidence upgraded

**Deliverable: Wallet-linked analysis live. GitHub + Solana signals merge into same result schema. Same recruiter card.**

---

## Stage 4 — CV Replacement & Decision Layer

- `DecisionCardGenerator` — PROCEED / REVIEW / REJECT based on capability scores + confidence levels
- `GapAnalysisEngine` — runs at apply-time against a job description; DEALBREAKER / SIGNIFICANT / MINOR severity
- `JobDescriptionParser` — Anthropic API; extracts required capabilities and stack; HR confirmation before saving
- `InterviewProbeLibrary` — STAR-format questions generated from gap severity; mandatory for DEALBREAKERs
- ApplicationsModule — POST /api/jobs/:id/apply → freeze DecisionCard + GapReport at apply time
- HR Application Views — ranked list with DecisionCard + summary card; full detail with GapReport + interview probes
- Candidate self-gap view — GET /api/me/gap-preview?jobId=:id — sees gaps without interview probes
- Rescore queue — triggered on job description weight change

**Deliverable: Full CV replacement loop. HR sees DecisionCard first. STAR-format probes live.**

---

## Stage 5 — Outcomes, ROI & Fairness

- `HireOutcome` — POST /api/outcomes; capture decision snapshot + 90-day performance rating
- Calibration analytics — capability score → performance correlation; which signals predict real outcomes
- ROI dashboard — GET /api/hr/orgs/:orgId/roi; cold-start shows industry benchmarks
- Fairness report — pass/reject rate by confidence tier; score distribution by ecosystem; contestation volume
- GDPR deletion — DELETE /api/me hard delete; soft anonymise applications; flush Redis
- Load test (k6): 100 concurrent analysis events; p95 < 2.5s
- `@sentry/node` initialised; correlationId via AsyncLocalStorage; BullMQ duration_ms logging

**Deliverable: Feedback loop live. GDPR compliant. Fairness reporting. ROI dashboard operational.**

---

## Stage 6 — ATS & Commercial

- ATS connectors — Greenhouse (OAuth 2.0, two-way), Lever (OAuth 2.0, two-way), Workday (OAuth/SOAP push)
- POST /api/hr/orgs/:orgId/ats/connect — OAuth flow
- POST /api/hr/orgs/:orgId/ats/sync — manual sync trigger
- Multi-tenancy load test: 20 concurrent orgs; RLS isolation verified under load
- GDPR DPA endpoint — DELETE /api/admin/orgs/:orgId permanently removes all applicant data on DPA termination
- E2E test suite: full analysis → gap report → DecisionCard → ATS sync → ROI → fairness

**Deliverable: ATS-integrated commercial product. Multi-tenant verified. Commercially ready.**

---

# 13. Success Metrics

| Metric | Target | What It Validates |
|---|---|---|
| Developer agreement rate: % who agree their scorecard is fair | > 80% in 30d | Capability inference is accurate; confidence qualifiers are honest |
| Recruiter time-to-decision | 50% reduction vs. CV review baseline | Output is actionable without additional investigation |
| Capability score correlation with hire outcome | Statistically significant | Scores predict real ability, not GitHub activity volume |
| Average analysis time (cache miss) | < 10s | Lightweight fetcher is sufficient; pipeline is not over-engineered |
| Profile share rate: % who actively share Colosseum profile | > 40% | Candidates perceive the profile as a net positive CV replacement |
| Cache hit rate after first wave of users | > 60% | Cache is serving real traffic and protecting GitHub API limits |
| Confidence qualifier accuracy: low confidence profiles have higher outcome variance | Statistically significant | The confidence system is calibrated — it accurately signals uncertainty |
| Zero-effort rate: % of profiles generated with no candidate input | 100% | The zero-manual-input goal is maintained end to end |

> **The Honest Ceiling**
>
> A 10/10 hiring tool would correctly predict developer performance in every context. That ceiling is not achievable from GitHub and on-chain signals alone, and claiming otherwise would be dishonest. The system cannot assess system design thinking, communication quality, cultural alignment, or management capability. The confidence qualifier layer makes this clear in every output. A system that is honest about its limits and accurate within them is more valuable than one that overclaims.