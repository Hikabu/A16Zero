

**COLOSSEUM**

# **Table of Contents**
* [Core Thesis](#0-core-thesis)
* [Tech Stack](#1-tech-stack)
* [Project Structure](#2-project-structure)
* [Architecture](#3-architecture)
    * [Decision Records](#31-architecture-decision-records)
    * [System Pipeline](#32-system-architecture-pipeline)
* [Features](#4-features)
    * [Firewall](#41-low-signal-firewall)
    * [Signals](#42-signal-engine--30-scored-signals)
    * [Confidence](#43-confidenceenvelope--risk-level-mapping)
    * [Behavior](#44-behaviorclassifier-patterns)
    * [Temporal](#45-temporal-scoring)
    * [RoleFit](#46-role-fit-weight-matrix)
    * [GapFill](#47-gap-analysis-engine)
    * [Fraud](#48-fraud-signal-handling)
    * [CV Replacement](#49-cv-replacement-layer--three-mandatory-output-objects)
* [Scoring Pipeline](#5-scoring-pipeline-detail)
    * [DataCompleteness](#51-datacompletenessengine)
    * [EcosystemNormaliser](#52-ecosystem-normaliser--25-cohorts)
    * [MinimumSample](#53-minimum-sample-thresholds)
    * [Web3Layer](#54-web3-layer)
* [Job](#6-job-description-parsing--gap-analysis)
    * [DescriptionParser](#61-jobdescriptionparser)
    * [Technology Matching](#62-technology-matching)
    * [STAR interview](#63-star-format-interview-probe-library)
    * [Interview Brief](#64-interviewer-brief-pdf)
* [Unkowns](#x--unknowns--not-observable--first-class-output)
* [BullMQ](#7-bullmq-queue-pipeline)
* [API](#8-api-contract)
    * [Auth API](#81-auth)
    * [Cndt API](#82-candidate)
    * [ScoreCard API](#83-scorecard-headless)
    * [Jobs](#84-jobs)
    * [Apply Cndt](#85-applications--candidate)
    * [Apply HR](#86-applications--hr)
    * [Outcomes](#87-outcomes--calibration)
    * [ORG](#88-org--roi-ats-fairness)
* [DB models](#9-key-database-models-prisma-schema-summary)
* [Learnings](#10-outcome-learning--transfer-learning)
    * [CrossClient Transfer](#101-cross-client-transfer-learning-cold-start-solution)
    * [Calibration Analytics](#102-calibration-analytics)
    * [ROI Dashboards](#103-roi-dashboard)
    * [Fairness](#104-fairness--disparate-impact-reporting)
* [ATS](#11-commercial-layer--ats-integration)
    * [ATS Connectors](#111-native-ats-connectors)
    * [MultiTenancy Architecure](#112-multi-tenancy-architecture)
    * [Candidate Contestation GDPR](#113-candidate-contestation-workflow-gdpr-article-22)
* [env](#12-environment-variables)
* [test](#13-verification-plan)
* [roadmap](#14-20-week-development-roadmap)
    * [stage 1](#stage-1--foundation-weeks-12)
    * [stage 2](#stage-2--core-scoring-pipeline-weeks-36)
    * [stage 3](#stage-3--web3-layer-weeks-79)
    * [stage 4](#stage-4--cv-replacement--decision-layer-weeks-1013)
    * [stage 5](#stage-5--outcomes-roi--fairness-weeks-1416)
    * [stage 6](#stage-6--ats--commercial-weeks-1720)
* [metrics](#15-success-metrics)

# **0. Core Thesis**

|<p>**The Fundamental Shift**</p><p>A CV is a claim. Colosseum is evidence. The DecisionCard (PROCEED / REVIEW / REJECT) is the primary output. Everything else supports the decision.  A developer's GitHub activity contains most of what a hiring decision actually requires — commit patterns, PR behaviour, collaboration depth, code quality proxies, technology breadth, and seniority signals. The problem is that raw GitHub data is noisy, visibility-uneven, and ecosystem-biased. Colosseum filters, interprets, weights, and presents that data as a decision-ready output — not a dashboard, not a score, not an analytics platform.</p>|
| :- |

## **Seven Structural Problems This System Solves**
- 1. Confidence is not intrinsic to scoring (overconfidence risk)
- 2. Unequal visibility across candidates (public vs. private work bias)
- 3. Seniority inferred heuristically instead of behaviourally
- 4. No separation between historical and recent performance
- 5. Absolute scores lack contextual grounding (no percentiles)
- 6. Uncertainty not propagated into decision-making
- 7. No feedback loop from hiring outcomes

# **1. Tech Stack**

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10, TypeScript 5, `"module": "commonjs"` |
| ORM | Prisma 7 |
| Database | PostgreSQL 15 + Row Level Security |
| Cache + Queue | Redis 7 + BullMQ + `@nestjs/bullmq` |
| GitHub Client | `@octokit/rest` + `@octokit/graphql` |
| Auth | `passport-github2` + `@nestjs/jwt` + `passport-jwt` |
| Token Security | Node.js `crypto` AES-256-GCM |
| Web3 (EVM) | `viem` (read-only) |
| Web3 (Solana) | `@solana/web3.js` (read-only, RPC-native — no Etherscan equivalent) |
| Config | `@nestjs/config` + Zod env schema (fail at startup) |
| Validation | `zod` + `nestjs-zod` |
| Security | `helmet`, `@nestjs/throttler` |
| Email | `resend` |
| Logging | `nestjs-pino` + `pino-http` |
| PDF generation | `puppeteer` (interviewer brief PDF) |
| Error tracking | `@sentry/node` |
| Testing | `jest`, `@nestjs/testing`, `supertest` |

---

# **2. Project Structure**

```
src/
├── main.ts / app.module.ts
├── config/env.schema.ts            # Zod — fail at startup
├── prisma/prisma.service.ts
├── redis/redis.service.ts
│
├── modules/
│   ├── auth/                       # GitHub OAuth + JWT
│   ├── profile/                    # Candidate profile, web3 address
│   ├── github-sync/                # Trigger + status polling
│   ├── jobs/                       # Read-only stub (HR team owns CRUD)
│   ├── applications/               # Apply + HR decision views
│   ├── outcomes/                   # HireOutcome capture + calibration
│   ├── ats/                        # Greenhouse / Lever / Workday connectors
│   ├── fairness/                   # Disparate impact reports
│   ├── roi/                        # ROI dashboard
│   └── admin/                      # Queue stats, calibration analytics
│
├── scoring/                        # Pure domain — no HTTP surface
│   ├── github-adapter/
│   ├── web3-adapter/               # viem (EVM) + @solana/web3.js — RPC-native
│   ├── firewall/                   # HackathonDetector + 8 fraud rules
│   ├── signal-engine/
│   ├── web3-signal-engine/         # contract-attributor.ts (ABI hash match)
│   ├── data-completeness-engine/
│   ├── privacy-adjustment-engine/
│   ├── behavior-classifier/        # 7 BehaviorPatterns
│   ├── career-phase-engine/        # Gap detection, peak-career window
│   ├── ecosystem-normaliser/       # 25+ cohorts
│   ├── temporal-score-layering/    # Peak / Recent / Trend
│   ├── percentile-calculator/
│   ├── role-fit-engine/
│   ├── gap-analysis-engine/
│   ├── confidence-envelope/        # Risk Level mapping
│   ├── capability-translator/      # Signals → Capability Statements
│   ├── developer-snapshot-builder/ # DeveloperSnapshot first-class object
│   ├── career-timeline-reconstructor/
│   ├── decision-card-generator/    # PROCEED / REVIEW / REJECT
│   ├── claim-generator/
│   └── interview-probe-library/    # STAR questions from gaps + Unknowns
│
├── scorecard/
│   ├── scorecard.controller.ts     # POST /api/scorecard/preview (headless)
│   └── scorecard.service.ts        # previewForUsername() — no DB write
│
├── queues/
│   ├── github-sync.processor.ts
│   ├── signal-compute.processor.ts
│   ├── rescore.processor.ts
│   ├── notification.processor.ts
│   ├── ats-sync.processor.ts
│   └── prior-calc.processor.ts     # Monthly PlatformPrior recompute
│
└── shared/
    ├── guards/ decorators/ interceptors/
    ├── crypto.util.ts
    └── weight.util.ts
```

---

# **3. Architecture**
## **3.1 Architecture Decision Records**

|**ADR**|**Decision**|**Rationale**|
| :- | :- | :- |
|ADR-001|Modular monolith (NestJS modules)|Clean domain boundaries; extract to microservices later without redesign|
|ADR-002|BullMQ on Redis for async ingestion|GitHub rate limits make sync ingestion infeasible (3–10 min/profile)|
|ADR-003|Scorecard computed at apply-time; signals cached at ingest|One profile → many role types with different weight matrices|
|ADR-004|Fraud signals reduce confidence, not roleFitScore|Fraud triggers have innocent explanations; confidence reduction prompts review|
|ADR-005|Low-visibility profiles: dynamic weight rebalancing, not penalty|Absence of public data is a measurement problem, not a performance signal|
|ADR-006|BehaviorClassifier replaces heuristic seniority inference|Commit count and repo age are poor proxies; pattern-based classification is fairer|
|ADR-007|Temporal scoring separates historical strength from recent activity|Both questions matter; each needs an independent answer|
|ADR-008|Percentile scoring is additive — does not replace absolute scores|Both cross-ecosystem and cohort-normalised views are always shown|
|ADR-009|Signal dominance cap: 40% per signal category|Prevents high-visibility GitHub devs from outscoring private-repo devs|
|ADR-010|Web3 signals as optional pillar, scored only for Web3 roles|Wallet signals are opt-in; non-Web3 devs are never penalised|
|ADR-011|Smart contract authorship via ABI hash match, not deployer wallet|Company-owned deployer wallets don't break developer attribution|
|ADR-012|Headless scorecard API callable without a user account|Testing and CI pipelines decouple from the user session layer|
|ADR-013|DeveloperSnapshot is a first-class database model|10-second CV replacement must be a stored object, not a derived UI element|
|ADR-014|Capability statements replace raw signal exposure|Raw signals are not useful to recruiters; translated statements are|
|ADR-015|DecisionCard is the primary output, not a secondary view|The decision is the product; scorecard data supports it|
|ADR-016|PostgreSQL RLS for multi-tenancy, not separate schemas|Row-level enforcement with single schema and manageable operational overhead|
|ADR-021|JD parser uses Anthropic API, not rule-based NLP|Job descriptions are too varied for regex. LLM extraction + HR confirmation|
|ADR-022|Dynamic weights require HR confirmation before activation|Silently changing scoring criteria would be a trust violation|
|ADR-023|Interview probes are template-driven, not AI-generated in production|Static templates are reviewable, consistent, and auditable|
|ADR-024|Outcome data collection is voluntary, never mandatory|Mandatory submission would be a barrier to HR adoption|
|ADR-025|Weight updates from outcome data require human review|Autonomous weight updates risk gaming and unpredictable score drift|
|ADR-026|Candidate self-gap view exposes gaps, not interview probes|Candidates seeing probes would allow scripted answers defeating their purpose|
|ADR-027|Minimum sample thresholds exclude signals, not zero them|Zeroing a signal is a systematic bias against new/private-work developers|
|ADR-028|ATS integration is webhook-out only at MVP; native connectors in v7|Covers the most valuable use case without the integration maintenance burden|
|ADR-029|ConfidenceEnvelope always surfaced alongside every score|A score without confidence is data without context|
|ADR-030|Fraud signals → confidence reduction, not roleFitScore|Many triggers have innocent explanations; pre-deciding is unfair|
|ADR-031|Low-visibility: dynamic weight rebalancing, not score penalty|Measurement problem, not performance signal|
|ADR-032|BehaviorPattern replaces heuristic seniority inference|Review/commit ratios and scope signals > commit count proxies|
|ADR-033|Temporal scoring separates historical strength from recent activity|Both questions need independent answers|
|ADR-034|Career gaps are noted, never penalised|Parental leave, health recovery, etc. are not performance signals|
|ADR-035|Percentile scoring is additive — does not replace absolute scores|Both cross-ecosystem and cohort-normalised views always shown|
|ADR-036|Signal dominance cap of 40% per signal type category|Prevents high-visibility bias|
|ADR-037|ROI dashboard uses industry benchmarks for cold-start|New clients must see value before they have enough data|
|ADR-038|Platform prior: 50/50 blend at 15 outcomes, 80/20 at 50|Conservative; org data dominates only when statistically meaningful|
|ADR-039|ATS connectors use OAuth 2.0; no API key-only auth|OAuth tokens expire and can be revoked without changing credentials|
|ADR-040|Multi-tenancy via Postgres RLS, not separate schemas|Single schema, row-level enforcement, manageable overhead|
|ADR-041|Candidate contestation stores full lifecycle in AuditLog|GDPR Article 22 requires documented review path|
|ADR-042|Disparate impact uses Fisher's exact test at p<0.05|Standard threshold in employment law contexts|
|ADR-043|New cohorts require 200 developers before creation|Balances accuracy against time cost of waiting for larger pool|
|ADR-044|STAR questions are gap-severity gated, not role-type gated|Severity-gating ensures interviewers probe hardest where system is most uncertain|
|ADR-045|Pattern accuracy disclosure shown until n≥200 per pattern|Transparency builds more trust than silence|
|ADR-046|Competitive positioning document is a product deliverable|Engineering without a sales narrative does not generate revenue|

---
## **3.2 System Architecture Pipeline**
The architecture is a NestJS modular monolith with a strict ingest → signal → score → decide → output pipeline. The scoring layer is pure domain code with no HTTP surface, making it independently testable.

 > GitHub / Web3 APIs
        
 > Adapters
 
 > Low-Signal Firewall
 
 > Signal Engines
 
 > Classification & Context
 
 > Normalization & Temporal Scoring
 
 > Scoring & Gap Analysis
 
 > Output Generation
 
 > Final Views
---

# **4. Features**
## **4.1 Low-Signal Firewall**
The most important single component in the system. Runs before any signal computation. Operates in conservative mode: when in doubt, preserves data rather than discards it.
---
```mermaid
flowchart TD
    A[Raw GitHub Data] --> B[Low-Signal Firewall]

    subgraph B [Low-Signal Firewall]
        direction TB
        F1[Bot Detection]
        F2[Tutorial Detection]
        F3[Fork Filtering]
        F4[Spam Pattern Detection]
        F5[Hackathon Detection]
    end

    B --> C[Clean Data]

```
---

|**Filter Type**|**Detection Method**|**Action**|
| :- | :- | :- |
|Zero-effort forks|Fork with zero original commits from user|Exclude entirely from scoring|
|Tutorial / bootcamp repos|File-structure signature: index.html + style.css + app.js, no test files|De-weight (not delete); junior first projects are understandable|
|Bot-pattern commit bursts|50+ commits in 3 hours, uniform messages, Sunday/off-hours clustering|Flag; exclude from quality signals; reduce confidence|
|Green-wall streak preservation|One-line commit every day — streak continuity with minimal diff size|Exclude streak continuity from all scoring pillars|
|Pure README activity|Entire commit history is documentation edits only|Excluded from code-quality signals; preserved for contribution context|
|Hackathon burst|HackathonDetector whitelist + 48–72h intense burst followed by silence|Labelled correctly as hackathon — not flagged as gaming|

---

## **4.2 Signal Engine — 30+ Scored Signals**
 > Clean Data
 
 > Extract Signals

>Behavior Classification

> Career Phase Analysis

> Temporal Scoring

> Normalization + Percentiles

---


|**Signal**|**HR-Readable Name**|**Category**|**Formula Summary**|
| :- | :- | :- | :- |
|activeWeeksRatio|Coding consistency|Activity|Meaningful commits / total weeks (1yr)|
|commitConsistencyScore|Commit reliability|Activity|Variance vs. developer's own median baseline|
|prThroughput90d|Output volume|Activity|PR count / normalised 90d window|
|reviewDepth|Code review depth|Collaboration|Avg review comments per PR reviewed|
|prReviewCount12m|Review participation|Collaboration|Total PR reviews in trailing 12 months|
|externalPrRatio|External contributions|Collaboration|PRs to repos user does not own / total PRs|
|prAcceptanceRate|Code acceptance rate|Quality|Merged PRs / opened PRs (excl. own repos)|
|changeRequestFrequency|First-pass correctness|Quality|Change requests before approval / all reviews received|
|reworkRatio|Code iteration rate|Quality|Post-review commits / total commits per PR|
|testFilePresence|Testing practice|Reliability|Boolean per repo (Linguist file tree scan)|
|cicdConfigDetection|CI/CD usage|Reliability|Boolean: GitHub Actions / Hardhat / Foundry / Anchor configs present|
|starsOnOriginalRepos|Community reception|Impact|Weighted sum by repo age and ecosystem size|
|highPrestigeRepoContributions|OSS prestige|Impact|Binary presence + weight by repo star/contributor count vs. curated list|
|newLanguagesAdopted1yr|Learning velocity|Growth|Unique languages added in past 12 months (Linguist diff)|
|seniorityTrajectory|Career progression|Growth|Trend line of review/architecture contributions vs. commit-only work|
|privateOrgActivity|Private work evidence|Activity|Boolean presence of PushEvents on private org repos (Events API)|

---

## **4.3 ConfidenceEnvelope → Risk Level Mapping**

|**Tier**|**Score Range**|**Risk Level**|**HR Guidance**|
| :- | :- | :- | :- |
|FULL|≥ 0.80|LOW\_RISK|Proceed on scorecard. Evidence is sufficient for confident decision.|
|PARTIAL|0\.55–0.79|MEDIUM\_RISK|Proceed with awareness. Score is directionally reliable. Flag gaps for interview.|
|LOW|0\.35–0.54|HIGH\_RISK|Review before advancing. Significant data gaps detected. Weight interview heavily.|
|MINIMAL|< 0.35|INSUFFICIENT\_DATA|Score withheld. Shown as: "Insufficient public data — not a quality signal."|

|<p>**Data Coverage Minimum Viability**</p><p>If a candidate's evaluable data coverage is below 40%, the overall score is withheld. HR is shown: "Insufficient public data — not a quality signal. This developer likely works primarily in private repositories." No score is better than a misleading score.</p>|
| :- |

---

## **4.4 BehaviorClassifier Patterns**

|**Pattern**|**HR Label**|**Key Detection Signals**|
| :- | :- | :- |
|REVIEW\_HEAVY\_SENIOR|Senior/Staff pattern: leads through review and architecture rather than volume coding|reviewDepth > 0.7, reviewCount/commitCount > 0.4, avgPRDescriptionLength > 200 chars, architecture-scope PRs present|
|COMMIT\_HEAVY\_MIDLEVEL|Mid-level pattern: reliable individual contributor, collaborative, delivery-focused|commitConsistencyScore > 0.65, reviewDepth < 0.5, externalPrRatio > 0.2, feature-level PR scope|
|BALANCED\_CONTRIBUTOR|Well-rounded contributor: both builds and reviews at consistent level|Balanced commit + review + external PR ratios|
|OSS\_COLLABORATOR|Open-source specialist: cross-ecosystem contributor, strong community presence|High external PR ratio, high prestige repo contributions, broad language breadth|
|EARLY\_CAREER|Emerging developer: strong growth signals; evaluate for growth potential over track record|Account < 18 months OR < 6 active months; rapidly evolving stack; elevated reworkRatio (learning signal)|
|RETURNING\_DEVELOPER|Returning developer: prior strong track record; recent activity resuming after gap|Career gap > 3 months + historicalStrength > 65 + recent activity resuming within last 3 months|
|WEB3\_SPECIALIST|Web3-native developer: smart contract experience with verified on-chain presence|Solidity/Rust/Vyper files, Hardhat/Foundry/Anchor configs, on-chain deployment evidence|

|<p>**Pattern Accuracy Disclosure**</p><p>Until the validation study achieves n≥200 outcomes per pattern, every BehaviorPattern label carries the disclosure: "Pattern classification is rule-based and hypothesis-generating. Treat as a starting point for interviewer investigation, not a concluded assessment." primaryConfidence is shown alongside every HR label.</p>|
| :- |

---

## **4.5 Temporal Scoring**

|**Window**|**Duration**|**Question Answered**|
| :- | :- | :- |
|Peak-career|Best 24-month period ever|What is this developer capable of at their best? Preserved at full weight regardless of career gaps.|
|Recent|Last 6 months|Are they currently active? Supplementary signal only, never the primary measure. Weight configurable per job.|
|Trend|Rolling 12-month slope|ASCENDING / STABLE / DECLINING / RETURNING — drives Career Timeline trajectory field.|

Career gaps (> 90 days) are labelled as context for HR — NEVER used as a score deduction. ADR-034 records this as a design requirement, not an option.

---
## **4.6 Role-Fit Weight Matrix**
> Signals

> Apply Role Weights

> Adjust for Data Completeness

> Apply Signal Caps

> Final Role Fit Score

|**Pillar**|**JUNIOR**|**MID**|**SENIOR**|**LEAD**|**Notes**|
| :- | :- | :- | :- | :- | :- |
|Technical Prowess|40%|30%|20%|15%|Language depth + breadth|
|Reliability (Testing/CI)|20%|35%|25%|20%|Tests, CI/CD, rework ratio|
|Collaboration|15%|20%|35%|45%|Review depth, external PRs|
|Innovation / Impact|25%|15%|20%|20%|Stars, prestige repos, OSS|
|Architecture (Senior+)|0%|0%|0–15%\*|0–15%\*|\*Redistributed from other pillars when architectural PRs detected|
|Web3 (opt-in)|Optional|Optional|Optional|Optional|20% additive for Web3 roles; renormalise other pillar weights (ADR-010)|

Signal dominance cap: no single signal category > 40% of total weight (ADR-009). Weights are stored as configuration, never hardcoded. Empirically validate against calibration set of 50+ developers before launch.

---

## **4.7 Gap Analysis Engine**
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
---

|**Gap Severity**|**Definition**|**HR Action**|
| :- | :- | :- |
|DEALBREAKER|Hard gate (requiredSignals.min not met)|Interview mandatory; overallVerdict → UNLIKELY\_FIT|
|SIGNIFICANT|Signal below threshold with material gap|Flag for interview probing; probe question generated|
|MINOR|Signal below threshold with small gap; may be pattern-expected|Optional verification; note shown with mitigating context|
---
## **4.8 Fraud Signal Handling **


Fraud signals should reduce **confidence**, not `roleFitScore`. Pre-deciding against a candidate before human review is unfair, as many fraud-detection triggers have legitimate explanations such as hackathons, corporate VPNs, shared university networks, or bootcamp repositories.


```ts
if (fraudTier === FraudTier.LIKELY_FRAUDULENT) {
  confidenceEnvelope.overallConfidence *= 0.50;

  confidenceEnvelope.caveats.push({
    signalKey: "fraudDetection",
    hrReadable: "Unusual activity patterns detected — recommend manual verification",
    severity: "WARNING",
  });
}
```

* `roleFitScore` represents candidate capability and should remain unaffected.
* `confidenceEnvelope` represents trust in the data and is the correct place to reflect uncertainty or risk signals.
---

## **4.9 CV Replacement Layer — Three Mandatory Output Objects**
Every scored profile produces three objects that together replace a CV. These are first-class data model objects produced before any output reaches a recruiter.


```mermaid
flowchart LR
    A[Signals + Scores] --> G[CV Replacement Layer : Snapshot + Timeline + Capabilities + Decision]
    G --> F[Final Candidate View]
```

**DeveloperSnapshot (10-Second Understanding Layer)**

|**Snapshot Field**|**Content**|**Source**|
| :- | :- | :- |
|Role|Primary inferred role type (BACKEND, FRONTEND, etc.)|RoleClassifier — top-1 with confidence %|
|Seniority|JUNIOR / MID / SENIOR / LEAD + confidence %|BehaviorClassifier output|
|Summary|1–2 sentences describing primary capability|Auto-generated from top BehaviorPattern + top 2 capability statements|
|Risk Level|LOW / MEDIUM / HIGH / INSUFFICIENT\_DATA|Mapped from ConfidenceEnvelope tier|
|Decision Signal|PROCEED / REVIEW / REJECT|Primary DecisionCard output — visible at list level, not only detail level|

**Career Timeline Reconstruction**

Reconstructs the developer's work history from observable behaviour: career phases, activity trends (ASCENDING/STABLE/DECLINING/RETURNING), career gaps (noted, never penalised), peak-career window (best 24-month period), and inferred employer context.

**Context Reconstruction**

Translates raw signals into inferred work environment: Work Environment (Enterprise/OSS/Startup/Academic), Collaboration Style (Solo builder/Team contributor/Code review leader), Team vs. Solo Pattern, Ecosystem Context.

---
# **5. Scoring Pipeline Detail**
## **5.1 DataCompletenessEngine**

|**VisibilityTier**|**Threshold**|**Action**|
| :- | :- | :- |
|FULL|≥ 80% signals evaluable|Normal scoring; full confidence|
|PARTIAL|50–79%|Excluded pillars removed from denominator; completenessNote shown when score < 0.70|
|LOW|25–49%|Dynamic weight rebalancing; prominently shown to HR|
|MINIMAL|< 25%|overallConfidence capped at 0.45; score withheld if dataCoveragePercent < 40%|

privateWorkIndicatorsDetected (high commit rate + low public activity + private-repo signals): positive note added: "Profile shows evidence of private or confidential work — public signals may underrepresent full capability".
---
## **5.2 Ecosystem Normaliser — 25+ Cohorts**

|**Cohort Group**|**Primary Signals**|**Min Dataset**|
| :- | :- | :- |
|TypeScript/Node.js Web|TypeScript 70%+, Node ecosystem|500+ developers|
|Python/ML & Data|Python 70%+, Jupyter, Kaggle signals|400+ developers|
|Rust/Systems|Rust 70%+, systems programming signals|300+ developers|
|Java/Spring Enterprise|Java 70%+, Spring/Maven signals|500+ developers|
|Go/Backend|Go 70%+, backend service patterns|300+ developers|
|Swift/iOS|Swift 70%+, Apple framework signals|300+ developers|
|Kotlin/Android|Kotlin 70%+, Android SDK signals|300+ developers|
|Solidity/Web3 EVM|Solidity/Vyper, EVM deployment evidence|200+ developers|
|C++/Embedded|C/C++ 70%+, low public repo, hardware signals|200+ developers|
|Ruby/Rails Web|Ruby 80%+, Rails framework signals|500+ developers|
|PHP/Laravel Web|PHP 80%+, Laravel/Symfony signals|500+ developers|
|Scala/Spark Data|Scala 70%+, JVM ecosystem signals|300+ developers|
|DevOps/Infrastructure|HCL/YAML 50%+, Terraform, Ansible signals|400+ developers|
|QA/Test Automation|Test framework signals, low feature PR ratio|300+ developers|
|C#/.NET Enterprise|C# 70%+, .NET ecosystem signals|500+ developers|
|Elixir/Phoenix|Elixir 70%+, functional style signals|200+ developers|
|R/Statistical Computing|R 60%+, CRAN packages, academic signals|200+ developers|
|Dart/Flutter Mobile|Dart 70%+, Flutter SDK signals|300+ developers|
|Machine Learning Research|Python 70%+, Jupyter, high paper/repo cross-reference|400+ developers|
|Security/Pentest|Multi-language, security-tool repos, CVE references|200+ developers|

Dynamic cohort creation: EcosystemCohortClassifier flags developers with cohort confidence < 0.45 → routes to UNCATEGORISED pool. When pool reaches 200 developers with consistent signal patterns → new cohort proposed for review.
---
## **5.3 Minimum Sample Thresholds**

|**Signal**|**Minimum Sample**|**If Below Minimum**|**Note**|
| :- | :- | :- | :- |
|prAcceptanceRate|≥ 10 PRs|Excluded from quality pillar|Common for junior devs|
|changeRequestFrequency|≥ 10 reviewed PRs|Excluded|Shown as "Not enough review history to assess"|
|reworkRatio|≥ 10 merged PRs|Excluded|Cannot compute without merge history|
|reviewDepth|≥ 5 reviews given|Excluded from collab pillar|Junior devs may not have been in position to review|
|commitConsistencyScore|≥ 6 active months|Excluded from activity pillar|New accounts or career changers|
|stackEvolutionScore|≥ 18 months history|Excluded from growth pillar|Cannot assess evolution with < 18 months|
|highPrestigeRepoContrib|≥ 3 external PRs merged|Not awarded|Single PR could be luck, not pattern|
---
## **5.4 Web3 Layer**
**Registration**

Candidate submits EVM address and/or Solana address. No signature proof required — just the address string (validated format only). Solana signal computation uses @solana/web3.js RPC calls directly — there is no Solana equivalent of Etherscan; attribution uses program authority lookups and transaction history from Solana RPC.

**Smart Contract Attribution (EVM)**

- 1. Etherscan/Sourcify author — if submitter address matches evmAddress → high confidence
- 2. ABI hash × GitHub repo match — compute ABI hash from dev's repo; compare against on-chain verified contracts → medium confidence
- 3. Org membership fallback — repo owned by verified org → low confidence ("contributed to")

**Solana Signals (RPC-native)**

- getDeployedPrograms — programs where pubkey is upgrade authority
- getSPLTokenActivity — SPL token creation/minting
- getMetaplexActivity — NFT program interactions
- getStakingInteraction — native staking program calls

---
# **6. Job Description Parsing & Gap Analysis**
## **6.1 JobDescriptionParser**
The parser runs when HR creates or edits a job posting. Uses the Anthropic API to extract structured requirements from free-text job descriptions. HR confirmation is required before saving — the system never silently changes scoring criteria.
---
|**Requirement Field**|**Description**|**Usage**|
| :- | :- | :- |
|requiredTechnologies|String[] — ["TypeScript", "PostgreSQL", "Docker"]|Hard requirement; flagged as dealbreaker if candidate lacks these|
|requiredRoleType|RoleType enum|Used by RoleFitEngine to select weight matrix|
|requiredSeniority|Seniority enum|Used to set seniority tier in scoring|
|collaborationWeight|LOW | MEDIUM | HIGH|Soft requirement; adjusts pillar weights, not a dealbreaker|
|ownershipWeight|LOW | MEDIUM | HIGH|Execution vs. leadership orientation|
|innovationWeight|LOW | MEDIUM | HIGH|Maintenance vs. greenfield orientation|
|teamSizeSignal|SOLO | SMALL | LARGE|Context shown to HR; not used in scoring|
|domainSignals|String[] — ["fintech", "web3"]|Context shown to HR; not used in scoring|
|parserConfidence|Float 0-1|HR review required if confidence < 0.75|
---
## **6.2 Technology Matching**
Required technologies from the JD are cross-referenced against the candidate's languageDistribution and detected tooling. A technologyFitScore (0-100) feeds into the gap analysis as a separate dimension. Missing technologies are listed in gaps with mitigating context if the candidate uses an adjacent technology.
---
## **6.3 STAR-Format Interview Probe Library**

|**Gap Severity**|**Pattern Context**|**Question Type & Example**|
| :- | :- | :- |
|DEALBREAKER|Any|Deep STAR probe (mandatory): "Tell me about a time you architected a system at the scale this role requires. What were the constraints and what would you do differently?" — with follow-up prompts|
|SIGNIFICANT|REVIEW\_HEAVY\_SENIOR|Verification STAR: "Walk me through a recent technical decision you influenced without writing the code. What was the outcome?"|
|SIGNIFICANT|COMMIT\_HEAVY\_MIDLEVEL|Validation STAR: "Describe a time you had to balance delivery speed with technical quality. How did you decide?"|
|MINOR|Any|Optional verification: "You haven't had much exposure to X in your visible work — have you encountered it in a different context?"|
|Career gap noted|RETURNING\_DEVELOPER|Context question (optional): "You've been away from active development for a period — what have you been working on or learning since returning?"|
|Unknowns layer|Any|Mandatory for every unobservable dimension: "This dimension cannot be assessed from visible work — the interviewer should probe directly."|
---
## **6.4 Interviewer Brief PDF**
Generated automatically when an application advances to interview stage. Delivered as a structured PDF per candidate.

- 45-minute interview guide: Opening (5 min) → Technical depth probes (25 min) → Gap-specific STAR questions (10 min) → Candidate Q&A (5 min)
- DeveloperSnapshot shown prominently at top — interviewer has the 10-second CV replacement before reading anything else
- BehaviorPattern label and primaryConfidence shown prominently
- Career Timeline summary: interviewer understands work history context before the interview starts
- Unknowns / Not Observable: explicit list of what the system could not assess and must be probed in the interview
- VALIDATE\_MANUALLY flags: explicit signals where the system has low confidence and the interviewer should probe directly
- ConfidenceEnvelope caveats with sections where the system could not fully evaluate the candidate
- Optional scoring rubric (1–4 scale) for interviewer completion inline

## **X-> Unknowns / Not Observable — First-Class Output**

|<p>**What Colosseum Cannot Assess — Always Shown to Recruiters**</p><p>× Communication quality — not observable from code alone × System design thinking — architectural PRs are a proxy, not a direct measure × Management capability — no observable signal from GitHub activity × Cultural fit — not a signal category × Intent and motivation — self-reported only; not evaluated × Communication quality in code review — PR comment content is not evaluated × Interview performance — distinct from engineering capability  These dimensions require interview validation. Colosseum generates targeted questions for each based on the candidate's specific gap profile.</p>|
| :- |

---
# **7. BullMQ Queue Pipeline**

```mermaid
flowchart TD
    A[github-sync] --> B[Fetch APIs + Cache]
    B --> C[signal-compute]
    C --> D[Run Full Pipeline]
    D --> E[Store Signals + Snapshot]
    E --> F[notification]

    G[rescore] --> D
    H[prior-calc] --> I[Update Platform Prior]
```
### github-sync (Concurrency: 5)

Steps:
1. Decrypt GitHub token
2. Fetch data:
   - REST API
   - GraphQL API
   - Events API
3. Cache responses (Redis, TTL: 24h)
4. Store rawDataSnapshot
5. Update syncProgress
6. Trigger `signal-compute` job

### signal-compute (Concurrency: 10)

Steps:
1. Apply Low-Signal Firewall
2. Compute signals (30+)
3. Run:
   - DataCompletenessEngine
   - PrivacyAdjustmentEngine
4. Classify:
   - BehaviorClassifier
   - CareerPhaseEngine
5. Compute:
   - EcosystemNormaliser
   - TemporalScoreLayering
   - PercentileCalculator
6. Build:
   - ConfidenceEnvelope (→ Risk Level)
7. Generate outputs:
   - DeveloperSnapshot
   - CareerTimeline
   - CandidateSignals
   - CandidateClaims
8. Store results in database
9. Trigger `notification` job
10. Rescore — re-run RoleFitEngine + DecisionCardGenerator when job weights change
11. ats-sync — two-way sync with Greenhouse / Lever / Workday
12. prior-calc — monthly: recompute PlatformPrior from anonymised HireOutcome aggregate

---
# **8. API Contract**
## **8.1 Auth**

|**Method**|**Path**|**Guard**|**Description**|
| :- | :- | :- | :- |
|GET|/auth/github|Public|GitHub OAuth redirect|
|GET|/auth/github/callback|Public|Exchange → JWT|
|POST|/auth/refresh|Bearer|Rotate refresh token|
|POST|/auth/logout|JWT|Revoke refresh token|
---
## **8.2 Candidate**

|**Method**|**Path**|**Guard**|**Description**|
| :- | :- | :- | :- |
|GET|/api/me/profile|JWT:CANDIDATE|Full profile + snapshot + timeline|
|PATCH|/api/me/profile|JWT:CANDIDATE|Update bio|
|POST|/api/me/github/sync|JWT:CANDIDATE|Trigger sync (1/24h throttle)|
|GET|/api/me/github/sync/status|JWT:CANDIDATE|{ status, progress }|
|POST|/api/me/web3/profile|JWT:CANDIDATE|Set evmAddress / solanaAddress|
|GET|/api/me/gap-preview?jobId=:id|JWT:CANDIDATE|Live GapReport for this candidate against this job's requirements (before applying)|
|DELETE|/api/me|JWT:CANDIDATE|GDPR hard delete|
|POST|/api/candidate/applications/:appId/contest|JWT:CANDIDATE|GDPR Article 22 contestation — flag specific signal with explanation|
---
## **8.3 Scorecard (Headless)**

|**Method**|**Path**|**Guard**|**Description**|
| :- | :- | :- | :- |
|POST|/api/scorecard/preview|X-Internal-Key|{ githubUsername, roleType } → GapReport (no persist; uses GITHUB\_SYSTEM\_TOKEN)|
---
## **8.4 Jobs**

|**Method**|**Path**|**Guard**|**Description**|
| :- | :- | :- | :- |
|GET|/api/jobs|Public|Open jobs (cursor paginated)|
|GET|/api/jobs/:id|Public|Job detail|
|GET|/api/jobs/:id/fit|JWT:CANDIDATE|Live fit preview|
|PATCH|/api/jobs/:jobId/temporal-config|JWT:HR|Set historicalWeight / recentWeight|
|POST|/api/hr/jobs/:jobId/parse-jd|JWT:HR|Parse JD text → ParsedJobRequirements (for HR confirmation)|
|POST|/api/hr/jobs/:jobId/confirm-requirements|JWT:HR|Save confirmed requirements; regenerate dynamicWeights; enqueue rescore|
---
## **8.5 Applications — Candidate**

|**Method**|**Path**|**Guard**|**Description**|
| :- | :- | :- | :- |
|POST|/api/jobs/:id/apply|JWT:CANDIDATE|Apply → freeze DecisionCard + GapReport + TechnologyFit + InterviewProbes|
|GET|/api/me/applications|JWT:CANDIDATE|My applications|
|GET|/api/me/applications/:id|JWT:CANDIDATE|Application + frozen snapshot|
---
## **8.6 Applications — HR**

|**Method**|**Path**|**Guard**|**Description**|
| :- | :- | :- | :- |
|GET|/api/hr/applications|JWT:HR|Ranked list with DecisionCard + Snapshot (filters: fitTier, riskLevel HIGH hidden by default, behaviorPattern, minScore)|
|GET|/api/hr/applications/:appId|JWT:HR|Full GapReport + evidence links + interview probes + not-observable list|
|PATCH|/api/hr/applications/:appId/decision|JWT:HR|SHORTLIST / REJECT / FLAG / REQUEST\_INFO → AuditLog|
|PATCH|/api/hr/applications/bulk|JWT:HR|Bulk status update|
|POST|/api/hr/compare|JWT:HR|Side-by-side up to 4 applications|
|GET|/api/hr/applications/:appId/confidence|JWT:HR|ConfidenceEnvelope for this application|
|GET|/api/hr/applications/:appId/temporal|JWT:HR|TemporalProfile — historical/recent breakdown, trajectory, gap notes|
|GET|/api/hr/applications/:appId/behavior|JWT:HR|BehaviorClassification — primaryPattern, primaryConfidence, hrLabel|
|GET|/api/hr/applications/:appId/percentile|JWT:HR|PercentileProfile — rawScore, percentile, cohort, cohortSize, percentileLabel|
|PATCH|/api/hr/applications/:appId/contest/resolve|JWT:HR|REVIEWED / ACTIONED / DISMISSED → AuditLog; if ACTIONED → enqueue rescore|
|POST|/api/hr/applications/:appId/interview-brief|JWT:HR|Generate PDF; mark interviewBriefSentAt; optionally email interviewer|
---
## **8.7 Outcomes & Calibration**

|**Method**|**Path**|**Guard**|**Description**|
| :- | :- | :- | :- |
|POST|/api/outcomes|JWT:HR|Record wasHired + performanceRating (1–5, at 90 days)|
|GET|/api/admin/calibration/behavior-outcomes|JWT:ADMIN|Pattern → hire rate (≥ 15 outcomes)|
|GET|/api/admin/calibration/trajectory-outcomes|JWT:ADMIN|Hire rate and retention rate by temporal trajectory type|
|GET|/api/admin/platform-prior|JWT:ADMIN|Current platform prior weights by BehaviorPattern|
|POST|/api/admin/platform-prior/recompute|JWT:ADMIN|Trigger anonymised aggregate recomputation. Scheduled monthly; manual trigger available.|
---
## **8.8 Org — ROI, ATS, Fairness**

|**Method**|**Path**|**Guard**|**Description**|
| :- | :- | :- | :- |
|GET|/api/hr/orgs/:orgId/roi|JWT:HR\_ADMIN|ROI dashboard for last 30/90/365 days. Cold-start returns industry benchmarks.|
|GET|/api/hr/orgs/:orgId/roi/history|JWT:HR\_ADMIN|Time series of ROI metrics for trend display|
|POST|/api/hr/orgs/:orgId/ats/connect|JWT:HR\_ADMIN|Complete ATS OAuth flow (Greenhouse / Lever / Workday)|
|POST|/api/hr/orgs/:orgId/ats/sync|JWT:HR\_ADMIN|Trigger manual two-way ATS sync for all open jobs|
|GET|/api/hr/orgs/:orgId/ats/sync/:syncJobId|JWT:HR\_ADMIN|Sync status (queued / running / complete / failed) and record counts|
|GET|/api/hr/orgs/:orgId/fairness-report|JWT:HR\_ADMIN|Quarterly disparate impact report PDF (?quarter=YYYY-QN)|
|GET|/api/admin/fairness/platform-summary|JWT:ADMIN|Cross-org fairness summary for internal monitoring|
---

# **9. Key Database Models (Prisma Schema Summary)**
All models include tenantId for RLS enforcement. Schema is migration-first via Prisma 5. JSONB columns store flexible signal data without schema explosion.

|**Model**|**Key Fields**|**Purpose**|
| :- | :- | :- |
|Organisation|tenantId (PK, RLS key), name, atsConnector (Json), priorBlendRatio (Float)|Multi-tenant root. ATS connector config and transfer learning blend ratio.|
|User|id, tenantId?, email, role (UserRole), accountStatus|null tenantId = CANDIDATE; set for HR/ADMIN. Roles: CANDIDATE, HR, HR\_ADMIN, ORG\_MANAGER, ADMIN|
|Candidate → DeveloperCandidate|userId, bio, careerPath; devProfile, githubProfile, web3Profile, signals, snapshot, timeline, claims|Modular user model; enables future non-developer types without schema changes|
|GithubProfile|githubUsername, githubUserId, encryptedToken (AES-256-GCM "v1:<iv>:<tag>:<cipher>"), syncStatus, syncProgress, rawDataSnapshot|GitHub OAuth token encrypted at rest; sync pipeline state machine|
|Web3Profile|evmAddress?, solanaAddress?, verifiedContracts (Json), onChainMetrics (Json)|Opt-in; no signature proof required; format validation only|
|CandidateSignals|30+ signal fields (Float?), fraudScore, fraudTier, dataCoveragePercent, ecosystemCohort, behaviorPattern, confidenceTier, riskLevel, peakCareerScore, recentScore, trendSignal, ecosystemPercentile, pillar\* (Float?), notObservable (Json)|Central signal cache. All computed signals stored here per dev.|
|DeveloperSnapshot|role, roleConfidence, seniority, seniorityConf, summary, riskLevel, decisionSignal, generatedAt|First-class CV replacement object (ADR-013). Not derived on every request.|
|CareerTimeline|phases (Json), trajectory, gapEvents (Json), peakWindow (Json), contextInference (Json)|Evidence-based career reconstruction. Replaces CV work history section.|
|CandidateClaim|claimType, claimKey, description, supportingSignals (Json), evidenceLinks (Json), confidence, isActive|Human-readable claims backed by specific PRs/commits/repos|
|Job|tenantId, roleType, seniorityLevel, requiredSignals (Json), weightOverrides (Json), parsedRequirements (Json), dynamicWeights (Json), technologyStack, collaborationWeight, ownershipWeight, temporalWeightConfig (Json)|Read-only stub — HR team owns CRUD in same DB. JD parsing fields added in v5.|
|Application|tenantId, jobId, candidateId, status, decisionCard (Json), gapReport (Json), capabilityStatements (Json), confidenceEnvelope (Json), behaviorPattern, temporalProfile (Json), percentileProfile (Json), roleFitScore, fitTier, fraudTier, contestation (Json), contestationStatus|Apply-time frozen scorecard. Contestation lifecycle for GDPR compliance.|
|HireOutcome|tenantId, applicationId, wasHired, performanceRating (1-5, at 90d), behaviorPatternAtDecision, temporalProfileSnapshot (Json), capabilityStatementsAtDecision (Json), confidenceAtDecision, roleFitScore, pillarScores (Json)|Feedback loop root. Validates capability statements predict job performance.|
|PlatformPrior|behaviorPattern, hireRate, avgPerformance90d, sampleSize, computedAt|Cross-client transfer learning prior. Recomputed monthly from anonymised aggregate.|
|RoiSnapshot|orgId, periodStart, periodEnd, avgScreenMin, interviewOfferRatio, timeToFirstDecision, costDelta|Client-facing ROI metrics. Cold-start shows industry benchmarks when < 5 applications.|
|FairnessReport|orgId, quarter, reportPdf (Bytes), flagCount, generatedAt|Quarterly disparate impact report for EEOC/GDPR compliance.|
|BenchmarkCohort|cohortKey, pillarDistributions (Json), sampleSize (min 200), computedAt|Percentile scoring reference. 25+ cohorts at launch.|
|AuditLog|tenantId?, entityType, entityId, action, actorId?, before (Json), after (Json), timestamp|Immutable audit trail. Required for contestation and GDPR DPA compliance.|

---
# **10. Outcome Learning & Transfer Learning**

|<p>**Design Principle**</p><p>The feedback loop does not automatically update scoring weights — that would risk gaming and unpredictable score drift. Instead, it accumulates outcome data reviewed by the Colosseum team quarterly and used to produce a new calibrated weight matrix. Weights change through a deliberate, reviewed process, not autonomously (ADR-025).</p>|
| :- |
---
## **10.1 Cross-Client Transfer Learning (Cold-Start Solution)**

|**Stage**|**Mechanism**|
| :- | :- |
|0–15 outcomes|100% platform prior: BehaviorPattern → hire rate and 90-day performance correlation, computed across all orgs with ≥15 outcomes, anonymised and aggregated. Synthetic calibration data used at launch.|
|15 outcomes|50% org-specific / 50% platform prior. Weight begins shifting toward org data. Clients see calibration status in their analytics.|
|50 outcomes|80% org-specific / 20% prior. Org data now dominates. Prior prevents calibration from drifting on small samples.|
|100+ outcomes|100% org-specific. Transfer learning has served its purpose. Org data is statistically significant on its own.|

Privacy: Platform prior computation uses only anonymised BehaviorPattern + outcome pairs. No applicant PII is included. Organisations may opt out of contributing to the prior while still receiving bootstrap calibration from it.
---
## **10.2 Calibration Analytics**
- BehaviorPattern → hire rate and avgPerformanceRating per pattern (requires ≥15 outcomes per pattern)
- Temporal trajectory → 90-day performance correlation (validates CareerPhaseEngine assumptions)
- Confidence envelope validation: LOW confidence evaluations should show higher outcome variance than FULL
- Pillar score → performance correlation: identifies which pillars are actually predictive vs. overweighted
- Role classification accuracy: how often does inferred role match actual hired role?
- Decision Card accuracy: PROCEED decisions resulting in hire + strong performance validate the Decision Card
---
## **10.3 ROI Dashboard**

|**Metric**|**Target**|**How Computed**|
| :- | :- | :- |
|avgScreenTimeMinutes|< 8 min|Mean HR time per application before first decision, from Application timestamps|
|interviewToOfferRatio|2\.5:1 (vs. 4:1 baseline)|Interviews conducted / accepted offers from HireOutcome data|
|timeToFirstDecisionDays|< 5 days|Calendar days from application created to first pass/reject action|
|estimatedCostPerHireDelta|Positive|HR hourly rate × screen time reduction + interview-to-offer improvement|
---
## **10.4 Fairness & Disparate Impact Reporting**
- Pass/reject rate by visibility tier: FULL vs. PARTIAL vs. LOW vs. MINIMAL. Flags statistically significant differences (Fisher's exact test, p<0.05).
- Pass/reject rate by career gap presence: careerGapDetected=true vs. false. Expected to be neutral given v6+ gap protection; report confirms this.
- Score distribution by ecosystem cohort: checks that no cohort is systematically scored below median without a corresponding percentile explanation.
- Contestation rate and resolution: volume, outcome breakdown, and time-to-resolution. High contestation rates on a specific signal trigger an internal review flag.

---
# **11. Commercial Layer & ATS Integration**
## **11.1 Native ATS Connectors**

|**Direction**|**Greenhouse**|**Lever**|**Workday**|
| :- | :- | :- | :- |
|Pull (inbound)|Applicant metadata, resume, stage|Candidate profile, tags, stage|Worker requisition, applicant record|
|Push (outbound)|roleFitScore, confidenceLabel, gapReport as scorecard|Score tag, gap summary, interview brief link|Custom field: ColossScore, ConfidenceTier|
|Trigger|Webhook on stage change|Webhook on application create|Polling + webhook fallback|
|Auth|OAuth 2.0 + API key|OAuth 2.0|OAuth 2.0 + Workday SOAP fallback|
---
## **11.2 Multi-Tenancy Architecture**
- Org-scoped RLS: every Application, HireOutcome, Job, and calibration record carries an orgId. Postgres RLS policies enforce queries only return rows matching the authenticated organisation's ID.
- Signal pipeline isolation: BehaviorPattern and TemporalProfile computations run in org-scoped Prisma contexts. No cross-org data leakage path exists in the query layer.
- Admin override: ADMIN-scoped JWTs can query across orgs only for anonymised calibration aggregation. No PII is included in cross-org queries.
- GDPR DPA support: per-org retention periods. DELETE /api/admin/orgs/:orgId permanently removes all applicant data for an org on DPA termination.
---
## **11.3 Candidate Contestation Workflow (GDPR Article 22)**

|**Step**|**Actor**|**Action**|
| :- | :- | :- |
|1\. Flag|Candidate|In self-gap view: selects specific caveat or signal + written explanation (e.g. "Career gap Aug 2023–Feb 2024 was parental leave")|
|2\. Notification|System|Contestation appears as review item in HR applicant detail view with candidate's explanation and flagged caveat|
|3\. Resolution|HR|Mark as REVIEWED, ACTIONED (manual score override), or DISMISSED (with required reason). All three stored in AuditLog.|
|4\. Notification|System|Candidate notified of outcome (reviewed/actioned/dismissed) — not internal HR reasoning|
|5\. Rescore|System|If ACTIONED → enqueue rescore with corrected signal value|

---
# **12. Environment Variables**
NODE\_ENV=development

PORT=3000

FRONTEND\_URL=http://localhost:3001

DATABASE\_URL=postgresql://colosseum:password@localhost:5432/colosseum

REDIS\_URL=redis://localhost:6379

GITHUB\_CLIENT\_ID=

GITHUB\_CLIENT\_SECRET=

GITHUB\_CALLBACK\_URL=http://localhost:3000/auth/github/callback

GITHUB\_SYSTEM\_TOKEN=            # headless scorecard preview

JWT\_SECRET=                     # min 64-char

JWT\_EXPIRY=15m

JWT\_REFRESH\_EXPIRY=7d

JWT\_ISSUER=colosseum-api

JWT\_AUDIENCE=colosseum-client

ENCRYPTION\_KEY=                 # 32-byte hex: openssl rand -hex 32

INTERNAL\_API\_KEY=               # min 32-char

EVM\_RPC\_URL=https://eth-mainnet.g.alchemy.com/v2/<key>

SOLANA\_RPC\_URL=https://api.mainnet-beta.solana.com

\# No ETHERSCAN\_API\_KEY — Solana uses RPC-native methods only

RESEND\_API\_KEY=

RESEND\_FROM=noreply@colosseum.dev

SENTRY\_DSN=

ANTHROPIC\_API\_KEY=              # JD parser

---
# **13. Verification Plan**

|**Stage**|**Test Target**|**Pass Condition**|**Version**|
| :- | :- | :- | :- |
|1|Auth full chain|OAuth → full chain created; ACTIVE; JWT issued; RLS enforced|v4|
|2|Firewall|Firewall zeroes correctly; BehaviorClassifier patterns; headless preview returns GapReport|v4|
|2|Minimum sample thresholds|Developer with 3 PRs: prAcceptanceRate excluded; pillar confidence reduced; HR sees "insufficient PR history" note|v5|
|2|Consistency validator|High prAcceptanceRate + high changeRequestFrequency → dataCoverageNote added to GapReport|v5|
|2|DataCompletenessEngine — LOW visibility|3 public repos: weights rebalanced; VisibilityTier=LOW; completenessNote shown; overallConfidence < 0.65|v6|
|2|Dynamic weight rebalancing|Excluded pillars removed from denominator; rebalancedWeights sum to 1.0 ± 0.01; no pillar zeroed|v6|
|2|ConfidenceEnvelope — MINIMAL tier|< 25% signals evaluable: overallConfidence capped at 0.45; hrLabel = "Low — validate manually"; caveats non-empty|v6|
|2|BehaviorClassifier — REVIEW\_HEAVY\_SENIOR|reviewDepth > 0.7 and reviewCount/commitCount > 0.4: primaryPattern=REVIEW\_HEAVY\_SENIOR; confidence > 0.65|v6|
|2|TemporalScoreLayering — career gap detection|8-month gap: careerGapDetected=true; longestGap="8 months"; careerGapNote populated; roleFitScore unchanged|v6|
|2|TemporalScoreLayering — RETURNING trajectory|Strong history + 6-month gap + recent resumption: trajectory=RETURNING; historicalStrength weighted at 0.65|v6|
|2|Fraud → confidence (not score)|FraudTier.LIKELY\_FRAUDULENT: overallConfidence reduced ≥ 45%; roleFitScore unchanged; WARNING caveat added|v6|
|2|Signal dominance cap|GitHub signals would contribute 65%: cap enforced at 40%; excess redistributed; distribution shown in confidence panel|v6|
|3|Web3 full chain|ContractAttributor; Solana RPC adapter with mock RPC|v4|
|4|JD parser|JD with "lead a team, set technical direction" → collaborationWeight=HIGH, ownershipWeight=HIGH with confidence > 0.80|v5|
|4|Dynamic weights|Job with parsed JD generates different pillar weights than identical job without JD|v5|
|4|Technology matching|JD requires TypeScript; candidate has no TypeScript repos → TypeScript in technologyFit.missing, TF score reduced|v5|
|4|Gap analysis|Candidate below reviewDepth threshold → gap in GapReport with severity=SIGNIFICANT, hrExplanation populated, interviewProbe generated|v5|
|4|Dealbreaker detection|Candidate below hard gate → dealbreakers[] populated; overallVerdict=UNLIKELY\_FIT|v5|
|4|Candidate self-gap view|GET /api/me/gap-preview?jobId=X: sees own strengths and gaps; no interview probes in response|v5|
|4|Interview brief PDF|POST /interview-brief → valid PDF with gap probes, strengths, caveats|v5|
|4|Pattern-aware gap severity|REVIEW\_HEAVY\_SENIOR with low commitConsistencyScore: displayed severity=MINOR with mitigating context. Same gap for COMMIT\_HEAVY\_MIDLEVEL displays SIGNIFICANT.|v6|
|4|Per-job temporal weight config|Job with recentWeight=0.70: recentActivityScore weighted at 70% in roleFitScore; confirmed via PATCH round-trip|v6|
|4|Apply determinism|Same input → identical roleFitScore; DecisionCard deterministic; contestation lifecycle|v4|
|5|Outcome collection|POST /outcome with wasHired=true, performanceRating=4 → HireOutcome created; AuditLog entry|v5|
|5|Calibration analytics|Admin GET /calibration/outcomes returns rank correlation, gap accuracy, pillar contribution data for orgs with ≥10 outcomes|v5|
|5|HireOutcome behavioral snapshot|POST /outcome: HireOutcome created with behaviorPatternAtDecision, temporalProfileSnapshot, confidenceAtDecision captured|v6|
|5|Load test|100 concurrent apply events; p95 < 2.5s; 0 failed jobs; memory profile stable|v4+|
|6|Multi-tenancy load test|20 concurrent orgs; RLS isolation verified under load|v7|
|All|Coverage|≥ 80% coverage via jest --coverage|v4+|

CI on every PR: lint → tsc --noEmit → prisma validate → jest → jest:e2e
---

# **14. 20-Week Development Roadmap**

|<p>**Principle**</p><p>Each stage ships working, testable, independently deployable code. v7 adds Stages 1–6 (20 weeks total). All v6 deliverables are preserved in full.</p>|
| :- |
---
## **Stage 1 — Foundation (Weeks 1–2)**
[x] nest new colosseum-api --strict; "module": "commonjs" in tsconfig

- Zod env schema (fail at startup); Docker Compose (pg15 + redis7)

[x] Full Prisma schema with ALL models including DeveloperSnapshot, CareerTimeline, PlatformPrior, RoiSnapshot, FairnessReport, AuditLog, BenchmarkCohort, Organisation + multi-tenant fields

[?] PostgreSQL RLS policies + Prisma middleware (SET LOCAL app.tenant\_id)

[?] PrismaService, RedisService singletons

- Global: helmet, nestjs-pino, @nestjs/throttler, ZodValidationPipe, CORS

- AuthModule: passport-github2 → upsert User (ACTIVE) → Candidate → DeveloperCandidate → GithubProfile (AES-256-GCM); JWT 15m + refresh 7d Redis

- GET /health; GitHub Actions CI

**Deliverable: OAuth → full user chain created; JWT issued; RLS enforced.**
---
## **Stage 2 — Core Scoring Pipeline (Weeks 3–6)**
- crypto.util.ts — AES-256-GCM encrypt/decrypt
- GithubAdapterService — Octokit REST + GraphQL + Events API; Redis cache; rate-limit backoff
- BullMQ: all queues registered (github-sync, signal-compute, rescore, notification, ats-sync, prior-calc)
- GithubSyncProcessor — full ingestion; syncProgress milestones; on:complete enqueue signal-compute
- FirewallService — 8 fraud rules + HackathonDetector whitelist
- SignalEngineService — 30 signals across 6 pillars; minimum sample thresholds enforced; ConsistencyValidator
- DataCompletenessEngine — dataCoveragePercent; VisibilityTier; dynamic pillar weight rebalancing (excluded pillars removed from denominator)
- PrivacyAdjustmentEngine — Events API private employer months → verifiedPrivateMonths
- BehaviorClassifier — 7 patterns with confidence %; accuracy disclosure injected until n≥200
- CareerPhaseEngine — gap detection (> 90 days); peak-career window (best 24m); trajectory
- EcosystemNormaliser — 9 cohorts at launch (25+ target)
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

**Deliverable: Full sync pipeline. Signals, DeveloperSnapshot, CareerTimeline, ConfidenceEnvelope all persisted. Headless preview works.**
---
## **Stage 3 — Web3 Layer (Weeks 7–9)**
- POST /api/me/web3/profile — EVM checksum + Solana base58 validation; upsert Web3Profile
- Web3AdapterService — viem EVM public client; @solana/web3.js Connection; Redis cache TTL 7d
- Solana signals (RPC-native): getDeployedPrograms, getSPLTokenActivity, getMetaplexActivity, getStakingInteraction
- ContractAttributor — EVM: Sourcify author check → ABI hash × GitHub repo → org membership fallback
- Web3SignalEngineService — computes web3Signals JSONB + pillarWeb3
- WEB3\_SPECIALIST BehaviorPattern integration
- Web3 signal dominance cap applied to Web3 category weight (no more than 40% of total)
- 5 WEB3 claim templates; Integrate Web3 into SignalComputeProcessor; pillarWeb3 20% additive for Web3 roles

**Deliverable: Web3 wallet opt-in; on-chain signals scored for Web3 roles.**
---
## **Stage 4 — CV Replacement + Decision Layer (Weeks 10–13)**
- DecisionCardGenerator — PROCEED / REVIEW / REJECT + top 3 strengths + top 3 risks from GapReport
- GapAnalysisEngine — DEALBREAKER / SIGNIFICANT / MINOR severity; mitigating context; pattern-aware gap severity adjustment
- InterviewProbeLibrary — STAR-format questions (severity-gated + Unknowns-driven); mandatory for DEALBREAKERs + all Unknowns; optional for MINOR
- JobDescriptionParser — Anthropic API integration; extracts ParsedJobRequirements; HR confirmation step before saving
- Dynamic weight generation from ParsedJobRequirements; TechnologyMatchingService (cross-references JD tech stack against languageDistribution)
- JobsModule (read-only) — GET /api/jobs, GET /api/jobs/:id, GET .../fit, PATCH .../temporal-config
- RoleFitEngineService — compute(signals, job): GapReport; pure deterministic
- ApplicationsModule — POST /api/jobs/:id/apply: guard ACTIVE + DONE + no duplicate → run RoleFitEngine + DecisionCardGenerator → freeze
- HR Application Views: list with DecisionCard + Snapshot; full detail with GapReport + evidence links + interview probes + not-observable list
- ConfidenceEnvelope colour-coded badge on all applicant cards; LOW tier → modal prompt before advancing
- HR decision actions: SHORTLIST / REJECT / FLAG / REQUEST\_INFO → AuditLog; bulk update; side-by-side compare (up to 4)
- Contestation workflow (GDPR Article 22): POST .../contest; PATCH .../contest/resolve → AuditLog; if ACTIONED → enqueue rescore
- Interviewer brief PDF — puppeteer render; 45-min guide; Snapshot + Timeline + probes + scoring rubric; triggered on SHORTLIST
- Candidate self-gap view — GET /api/me/gap-preview?jobId=:id — sees own gaps without interview probes
- BehaviorPattern accuracy disclosure added to applicant detail UI; pattern confidence shown alongside hrLabel
- Rescore queue — triggered on weightOverrides or temporalConfig change

**Deliverable: Full CV replacement loop. HR sees DecisionCard first. Interview brief PDF auto-generated. STAR-format probes live.**
---
## **Stage 5 — Outcomes, ROI & Fairness (Weeks 14–16)**
- HireOutcome — POST /api/outcomes; capture full behavioral + temporal snapshot at decision time (behaviorPatternAtDecision, temporalProfileSnapshot, confidenceAtDecision)
- PlatformPrior recompute (monthly cron) — anonymised BehaviorPattern→performance aggregate; priorBlendRatio per org
- Calibration analytics — behavior-outcome + trajectory-outcome correlation views
- ROI dashboard — GET /api/hr/orgs/:orgId/roi; cold-start shows industry benchmarks
- Fairness report — GET /api/hr/orgs/:orgId/fairness-report; Fisher's exact test p<0.05; PDF via puppeteer
- GDPR deletion DELETE /api/me — hard delete dev data; soft anonymize applications; flush Redis; AuditLog
- GDPR Article 22 verification — contestation resolution within 5-day SLA; AuditLog immutability enforced
- @sentry/node initialized; correlationId via AsyncLocalStorage; BullMQ duration\_ms logging
- Load test (k6): 100 concurrent apply events across full engine stack including v6 engines; p95 < 2.5s
- Remaining BenchmarkCohort population (target: 25+ cohorts)

**Deliverable: Feedback loop live. GDPR compliant. Fairness reporting. ROI dashboard. Outcome learning operational.**
---
## **Stage 6 — ATS & Commercial (Weeks 17–20)**
- ATS connectors — Greenhouse (OAuth 2.0, two-way), Lever (OAuth 2.0, two-way), Workday (OAuth/SOAP push); no API key-only auth (ADR-039)
- POST /api/hr/orgs/:orgId/ats/connect — OAuth flow completion
- POST /api/hr/orgs/:orgId/ats/sync — manual sync trigger; GET .../sync/:syncJobId — status + record counts
- Connector test suite (mock ATS responses)
- Multi-tenancy load test: 20 concurrent orgs; RLS isolation verified under load
- GDPR DPA endpoint (DELETE /api/admin/orgs/:orgId) — permanently removes all applicant data for org on DPA termination
- Competitive positioning document produced (non-engineering deliverable)
- E2E test suite: contestation → fairness report → ATS sync → ROI → DecisionCard accuracy → full engine stack

**Deliverable: ATS-integrated commercial product. Multi-tenant verified. Commercially ready.**
---

# **15. Success Metrics**

|**Metric**|**Target**|**What It Validates**|
| :- | :- | :- |
|Developer agreement rate: % who agree their scorecard is fair|> 80% in 30d|Fairness mechanisms and confidence transparency are working|
|Hiring manager time-to-shortlist|50% reduction|Decision layer outputs are actionable without additional investigation|
|HR screening call conversion: % who pass technical interview|> baseline|Scorecard predicts real ability, not just CV quality|
|Average screen time per application|< 8 minutes|HR-readable outputs and inline decision actions eliminate context-switching|
|Profile share rate: % who actively share Colosseum profile|> 40%|Candidates perceive the profile as a net positive CV replacement|
|Return recruiter rate: % of HR users who run a second search within 30 days|> 70%|Product is genuinely useful to the hiring side, not just a novelty|
|Confidence envelope validation: HIGH RISK has higher outcome variance than LOW RISK|Statistically significant|The confidence system is calibrated — it accurately signals uncertainty|
|Contestation resolution rate: % resolved within 5 business days|> 95%|GDPR Article 22 workflow is operational and HR teams are engaging with it|
|Decision Card accuracy: PROCEED → hire + ≥3 performance rating at 90 days|> 70%|Decision Cards predict hiring success, not just signal strength|

|<p>**The Honest Ceiling**</p><p>A 10/10 hiring tool would correctly predict developer performance in every context. That ceiling is not achievable from GitHub signals alone, and claiming otherwise would be dishonest. The system cannot assess system design thinking, communication quality, cultural alignment, or management capability. The ScorecardCaveat layer makes this clear in every output. A system that is honest about its limits and accurate within them is more valuable than one that overclaims.  The path from launch quality to a 9.5+ system runs through client adoption, real outcome data, and ML-validated pattern detection — not additional pre-launch engineering.</p>|
| :- |

