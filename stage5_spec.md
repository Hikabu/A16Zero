# Stage 5 — Planned Upgrades

> **Status:** Deferred. These features are explicitly out of scope for Stage 4 and will not be started until all P1–P4 Stage 4 refactors are production-verified.
>
> **Prerequisites before Stage 5 begins:** frozenScorecard populated correctly at apply-time, HR/CTO dual-view contract live, typed job columns (roleType, seniorityLevel, requiredSkills) written by confirm-requirements, scorecard export rendering full technical detail.

---

## Overview

Stage 5 focuses on three interconnected upgrades: deep skill and language matching throughout the hiring pipeline, structured job requirements replacing the current JSON blob approach, and configurable per-company pipeline stages. These features were identified during the Stage 4 post-audit as genuine gaps, but each one requires schema migrations, analysis pipeline changes, and ATS filter reworks that are too large to safely bundle into Stage 4.

---

## S5-A — Skill & Language Matching in ATS

### Problem

The GitHub analysis currently extracts languages used and contribution signals but this data feeds only the scorecard display. It is never compared against job requirements in a structured way. HR cannot filter applications by "candidates who know Rust" or "candidates with >50% TypeScript". The ATS is effectively blind to the technical match between candidate and role.

### What needs to change

**Analysis pipeline.** When `parse-jd` extracts job requirements, it should produce a structured `requiredSkills` array (already partially introduced in P1 via the `requiredSkills String[]` column on `JobPost`). During the scoring step, the candidate's `languagesUsed` and any explicitly listed technologies from their GitHub profile should be matched against `requiredSkills`. The result should produce:

- `matchedSkills: string[]` — skills the candidate demonstrably has
- `missingSkills: string[]` — required skills not evidenced in their GitHub
- `skillMatchScore: number` — a 0–100 score representing coverage

These should be written into the frozen `gapReport` at apply-time (already part of the freeze structure introduced in P2) alongside the existing `matchedTechnologies` / `missingTechnologies` which are currently derived only from the AI decision card and may be imprecise.

**ATS filters.** Add `?skills=TypeScript,Rust` as a query param on `GET /applications/hr/jobs/{jobId}`. This filters applications where `matchedSkills` contains at least one of the requested skills. The filter should use the frozen `gapReport.matchedSkills` field — not live analysis — to maintain consistency with the snapshot model.

**Candidate browse.** Add `?skills=` to the public `GET /jobs` endpoint so candidates can search for jobs requiring skills they have. This is a job-side filter using `requiredSkills String[]` on `JobPost` with Prisma's `hasSome` operator (introduced in P1 schema groundwork).

**Scorecard display.** The `technicalView.gapSummary` already contains `matchedTechnologies` and `missingTechnologies`. After S5-A these should be replaced or augmented with the richer `matchedSkills` / `missingSkills` data derived from structured matching rather than AI inference.

### Scope

Touches: `parse-jd` AI prompt, `AnalysisResult` scoring logic, `buildFrozenScorecard()` helper, `gapReport` schema, `getJobApplications()` service, `getPublicJobs()` service. No new endpoints — all changes are additions to existing endpoints and the analysis pipeline.

---

## S5-B — Structured Job Requirements (replacing the JSON blob)

### Problem

`parsedRequirements: Json?` and `dynamicWeights: Json?` on `JobPost` are opaque blobs. Stage 4 (P1) partially addressed this by promoting `roleType`, `seniorityLevel`, and `requiredSkills` to typed columns at confirm-requirements time. However the full requirements object — required experience years, preferred tools, soft skill weights, web3 specifics — still lives as unindexed JSON. This makes it impossible to build advanced ATS filters, analytics, or scoring rule introspection without fragile JSON path queries.

### What needs to change

**New `JobRequirements` model.** Extract the requirements structure into a related model rather than a blob:

```prisma
model JobRequirements {
  id                String    @id @default(uuid())
  jobPostId         String    @unique
  jobPost           JobPost   @relation(fields: [jobPostId], references: [id])

  requiredSkills    String[]  @default([])
  preferredSkills   String[]  @default([])
  seniorityLevel    Seniority?
  roleType          RoleType?
  minExperienceYears Int?
  isWeb3Role        Boolean   @default(false)

  // Scoring weights (replacing dynamicWeights Json)
  collaborationWeight Float  @default(0.25)
  ownershipWeight     Float  @default(0.25)
  innovationWeight    Float  @default(0.25)
  reliabilityWeight   Float  @default(0.25)

  confirmedAt       DateTime?
  rawAiOutput       Json?     // preserve original AI parse for debugging

  @@map("job_requirements")
}
```

**Migration strategy.** When this model is introduced, `confirm-requirements` writes to `JobRequirements` instead of the `parsedRequirements` blob. The blob is kept read-only for backward compat for one release, then deprecated.

**Scoring system.** The scoring pipeline reads `dynamicWeights` from `JobRequirements` typed fields rather than parsing JSON. This makes weight introspection testable.

**Note:** The `parsedRequirements` and `dynamicWeights` Json fields introduced in Stage 4 can be kept on `JobPost` until migration is complete to avoid breaking existing applications. `JobRequirements` is additive.

---

## S5-C — Per-Company / Per-Job Configurable Pipeline Stages

### Problem

`PipelineStage` is a global enum. Every company gets the same stages: `APPLIED → SHORTLISTED → INTERVIEW_HR → INTERVIEW_TECHNICAL → INTERVIEW_FINAL → OFFER → HIRED | REJECTED`. Some companies have two interview rounds, some have four. Some skip the HR interview entirely. Some add a take-home test stage. The current system forces all hiring processes into one rigid path.

### What needs to change

**New `PipelineTemplate` model.** Companies define their own stage sequence:

```prisma
model PipelineTemplate {
  id          String         @id @default(uuid())
  companyId   String
  name        String         // e.g. "Engineering Standard", "Fast-Track"
  isDefault   Boolean        @default(false)
  stages      Json           // ordered array of stage definitions
  company     Company        @relation(fields: [companyId], references: [id])
  jobPosts    JobPost[]      // jobs using this template

  @@map("pipeline_templates")
}
```

Each stage definition in the `stages` JSON array contains:

```json
{
  "key": "TAKE_HOME",
  "label": "Take-Home Test",
  "order": 3,
  "allowsInterviewQuestionGeneration": false,
  "isTerminal": false
}
```

**Per-job assignment.** `JobPost` gets a `pipelineTemplateId` FK. When null, the company's default template is used.

**Transition validation.** `PATCH /applications/hr/{appId}/stage` currently validates against the hardcoded enum order. After S5-C, it validates against the job's active template stage sequence: the target stage must have an `order` greater than the current stage's `order` in the template.

**Interview question trigger.** Currently hardcoded to fire on `INTERVIEW_HR | INTERVIEW_TECHNICAL | INTERVIEW_FINAL`. After S5-C, it fires on any stage with `allowsInterviewQuestionGeneration: true` in the template.

**HR setup endpoints.** New endpoints needed:
- `POST /pipeline-templates` — create a template
- `GET /pipeline-templates` — list company templates
- `PATCH /pipeline-templates/{id}` — update
- `PATCH /jobs/{id}/pipeline` — assign template to job (before publishing only)

**Migration path.** Existing `PipelineStage` enum values map to a system-default template created at migration time. Existing shortlists with `pipelineStage` enum values continue to work — the enum stays valid as a legacy reference until all companies have migrated to templates.

### Complexity note

This is the largest change in Stage 5. It affects transition validation, question generation, history logging, ATS filter options, and the HR dashboard stage display. It should be scoped as its own sub-project with dedicated planning before implementation begins.

---

## Sequencing within Stage 5

S5-A (skill matching) should be done first — it is additive and builds on the P1/P2 groundwork without touching the pipeline or requirements model. S5-B (structured requirements) should follow, as it gives S5-A a cleaner data source for skill matching. S5-C (configurable pipelines) is the largest and most risky change and should come last, with its own planning spike before any code is written.

---

## What Stage 5 does NOT include

- Messaging / communication features between HR and candidates
- Calendar integration for interview scheduling
- Automated scoring re-computation when a candidate updates their GitHub post-application (the freeze model prevents this by design)
- Bulk actions on applications (mass shortlist, mass reject)
- Public analytics or leaderboard features

These may be considered for Stage 6 or later.
