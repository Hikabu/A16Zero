# PRISMA.md
Prisma version is 6.19
## Purpose

This file is the **quick source of truth** for our Prisma database architecture.
Goal: help teammates understand the data model fast and avoid breaking migrations or relations.

Our MVP focuses on the **verified company → paid job bonus → matched candidates → shortlist workflow**.

---

# 1. High-Level ERD

Core lifecycle:

```
Company → JobPost → Shortlist → Candidate → TalentProof
```

Flow:

* Companies create job posts
* Job posts move through lifecycle (draft → paid → active → closed)
* Candidates bring proof-of-talent
* Matching engine creates shortlists per job

Relationship overview:

```
Company 1 ─── n JobPost
JobPost 1 ─── n Shortlist n ─── 1 Candidate
Candidate 1 ─── n TalentProof
```

Anchor models:

* Company
* JobPost
* Candidate
* Shortlist
* TalentProof

---

# 2. Naming Conventions

Consistency is critical.

### Model vs Database tables

We keep Prisma models clean while DB stays SQL-friendly.

| Prisma            | Database           |
| ----------------- | ------------------ |
| PascalCase models | snake_case tables  |
| camelCase fields  | snake_case columns |

We use `@@map()` to map models → DB tables.

Example:

```prisma
model JobPost {
  ...
  @@map("job_posts")
}
```

### Enums = business logic

Enums define system states and should never be changed casually.

Key enums:

* `JobStatus` → job lifecycle
* `MatchTier` → matching quality
* `ShortlistStatus` → recruiter workflow
* `ProofStatus` → verification workflow

---

# 3. Relationship Logic

### Where foreign keys live

We always keep FK on the **child side**.

Examples:

* `JobPost.companyId`
* `TalentProof.candidateId`
* `Shortlist.jobPostId`
* `Shortlist.candidateId`

### Important relation decisions

#### Company → JobPost (1:n)

A company owns many job posts.

#### Candidate → TalentProof (1:n)

A candidate can have many proofs of talent.

#### JobPost ↔ Candidate (m:n via Shortlist)

This is the **core business relation**.

Shortlist exists because:

* Same candidate can match multiple jobs
* Match tier differs per job

Unique constraint prevents duplicates:

```prisma
@@unique([jobPostId, candidateId])
```

---

# 4. Job Lifecycle (Critical)

Job status flow:

```
DRAFT
 → PENDING_PAYMENT
 → ACTIVE
 → CLOSED_PENDING
 → CLOSED
```

Meaning:

* `PENDING_PAYMENT` → created but bonus not paid yet
* `ACTIVE` → visible and matching runs
* `CLOSED_PENDING` → role filled but payment processing
* `CLOSED` → fully finished

Never skip states in code.

---

# 5. Performance & Query Strategy

### Indexed fields

We index high-traffic filters:

```prisma
JobPost.status
JobPost.companyId
Shortlist.jobPostId
Shortlist.matchTier
TalentProof.candidateId
```

### Pagination standard

We use **cursor-based pagination** everywhere.

Why:

* Works for large datasets
* Required for infinite scroll

Offset pagination should NOT be used.

### JSON strategy (skills)

`Candidate.skills` is JSON for MVP.

Future upgrade:

* Move to normalized skills table
  OR
* Add Postgres GIN index

---

# 6. Migration Workflow (Team Rules)

### Local development

Create migrations:

```
npx prisma migrate dev
```

Never use `db push` in shared environments.

### Pull latest schema

```
npx prisma migrate deploy
```

### Regenerate client after changes

```
npx prisma generate
```

---

# 7. Seed Data

We maintain seed data for local testing.

Run:

```
npx prisma db seed
```

Seed includes:

* demo company
* demo job post
* demo candidates + talent proofs

---

# 8. Prisma Client Extensions / Future

Planned middleware:

* Soft delete via `deletedAt`
* Query logging in dev
* Computed match score aggregation

---

# MVP Scope Reminder

Intentionally NOT in DB yet:

* payments / transactions
* notifications
* candidate applications
* partner integrations

These will be added after validating the core hiring loop.

---

