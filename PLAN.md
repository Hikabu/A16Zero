# Web3 Hiring Platform — Employer MVP Execution Plan
**Hackathon Edition | 3-Week Sprint | Backend Architecture**

> **Role:** Senior Backend Architect & Team Lead
> **Stack:** Node.js (CommonJS) · Prisma + PostgreSQL · Swagger · Privy · Alchemy AA · REST API
> **Deadline:** 3 Weeks

---

## 0. MVP SUCCESS DEFINITION

"Done" is defined when ALL of the following are verifiable on demo day:

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | Employer can sign up via Privy | `POST /auth/privy-login` returns JWT |
| 2 | JWT secures all protected routes | `401` on missing/invalid token |
| 3 | Smart wallet created invisibly | `GET /wallet/me` returns address |
| 4 | Company profile created and stored | `GET /companies/me` returns profile |
| 5 | Job draft created and saved | `POST /jobs/draft` → DB record |
| 6 | Bond amount calculated server-side | `GET /jobs/:id/bond-estimate` returns USDC |
| 7 | Bond funded → job becomes ACTIVE | `POST /jobs/:id/fund-bond` → status = ACTIVE |
| 8 | Candidate search works with filters | `GET /candidates/search?skills=...` returns results |
| 9 | Employer can shortlist candidates | `POST /jobs/:id/shortlist/:candidateId` succeeds |
| 10 | Shortlist is retrievable | `GET /jobs/:id/shortlist` returns list |
| 11 | Swagger UI is usable as frontend playground | All endpoints documented + testable |
| 12 | Tests pass for critical flows | `npm test` exits 0 |
| 13 | Frontend can fully integrate | No CORS errors, consistent response shapes |

---

## 1. ARCHITECTURE OVERVIEW

The backend is organized into **vertical feature modules**. Each module owns its routes, controller, service, and any sub-utilities. There is no horizontal layering (no "all controllers in one folder").

```
src/
├── modules/
│   ├── auth/           # Privy verification + JWT issuance
│   ├── company/        # Employer company profile
│   ├── wallet/         # Smart wallet creation + AA transactions
│   ├── job/            # Job lifecycle management
│   ├── bond/           # Bond calculation + funding flow
│   ├── candidate/      # Search + seed data
│   └── shortlist/      # Shortlisting candidates per job
├── middleware/         # JWT guard, error handler, request logger
├── config/             # Env validation, Prisma client, Alchemy client
├── utils/              # Zod schemas, response wrappers, constants
└── tests/              # Integration + unit tests per module
```

### Module Responsibilities

**Auth Module**
Owns the entire authentication boundary. Verifies Privy tokens server-side, creates a database user record on first login, issues and validates JWTs. Nothing else in the system should touch Privy directly — they call auth services.

**Company Module**
Manages the employer's company profile (name, logo, description, industry). One company per Privy user. Required before a job can be created. Acts as the "employer identity" layer.

**Wallet / AA Module**
Wraps Alchemy's Account Abstraction SDK. Responsible for creating or retrieving a smart account for each employer, generating gasless transaction payloads, and storing wallet addresses. The rest of the system treats this as a black box — it asks for "the wallet address" and "a signed tx payload" and does not touch SDK internals.

**Job Module**
Manages the full job lifecycle: DRAFT → PUBLISHED → ACTIVE → CLOSED. Enforces that a job cannot go ACTIVE without a confirmed bond. Owns job CRUD and status transitions. The bond module calls back into job to flip status.

**Bond Module**
Two concerns: (1) server-side bond calculation based on salary range, using a configurable formula; (2) the funding flow — accepting a frontend trigger, constructing a gasless USDC transfer via the Wallet module, recording the transaction hash, and marking the job ACTIVE. Bond logic lives here, not in the Job module.

**Candidate Search Module**
Reads from the candidates table (seeded data for MVP). Supports filtering by skills (array overlap), country, and keyword (name/title full-text search). Returns TalentProof scores alongside results. No writes in MVP — this module is read-only.

**Shortlist Module**
Manages the `JobShortlist` join table. Allows employer to add/remove candidates per job, retrieve the shortlist, and update candidate status (e.g., CONTACTED, INTERVIEW_SCHEDULED). Scoped strictly per employer — employers cannot see each other's shortlists.

**Testing + Seed Module**
Not a runtime module. Contains Jest + Supertest integration tests organized by feature, a Prisma seed script for 50–100 fake candidates using Faker.js, and a test database setup helper.

---

## 2. DEVELOPMENT STRATEGY

### The Core Principle: Vertical Slices, Not Horizontal Layers

**Wrong order:** Build all models → build all controllers → build all services → wire up routes.

**Right order:** Build Auth end-to-end → build Company end-to-end → build Jobs → Bond → Candidates → Shortlist.

Each slice delivers a working, tested, integrated feature before the next begins.

### Why This Order Reduces Risk

**Auth first** because everything else depends on it. If Privy integration is broken or takes longer than expected, you find out on Day 1, not Day 10. Every subsequent module can be built with real authentication from the start.

**Company before Jobs** because the database enforces a `companyId` foreign key on jobs. More importantly, the frontend signup flow creates a company profile immediately after first login — if this endpoint is missing, the frontend is blocked.

**Jobs before Bond** because the bond calculation and funding endpoints reference a specific job by ID. You need a real job record in the DB to test the bond flow end-to-end.

**Bond after Jobs** but before Candidates, because bond funding is what makes a job ACTIVE, and only ACTIVE jobs are meaningful for candidate search. Building it here keeps the job lifecycle coherent.

**Candidates after Bond** because search results are only useful in context of an active job. Also, seeding data is fast and candidates are read-only — this is the lowest-risk module.

**Shortlist last** because it depends on jobs (must exist), candidates (must be seeded), and the auth context (employer-scoped). It is also the simplest module and a good candidate for parallel work in Week 3.

**Tests are written per slice, not at the end.** Writing tests for Auth during Week 1 means you have a working test harness before you ever touch blockchain code in Week 2.

---

## 3. PHASE-BY-PHASE EXECUTION PLAN

---

### WEEK 1 — FOUNDATION
**Goal:** A secured, running API where an employer can register, authenticate, and create a company profile. Frontend can begin integration immediately.

---

#### Step 1 — Project Skeleton

**Why first:** Every subsequent task assumes this infrastructure exists. Doing this once cleanly is cheaper than retrofitting it across 7 modules.

**Build list:**

- Module folder structure (as above)
- `.env` validation using `envalid` or Zod — fail fast on missing env vars at startup
- Winston or Pino logger with request ID middleware
- Global error handler: catches thrown errors, maps to consistent JSON shape
- Request validation wrapper using Zod — all inputs validated at route boundary, never in service layer
- Swagger base config — group endpoints by tag (`auth`, `companies`, `jobs`, etc.), responses documented
- Prisma client singleton with connection health check on startup
- `response.js` utility: `{ success, data, message, meta }` shape — used everywhere, so frontend gets predictable responses

**Validation schemas** are defined as Zod schemas in `utils/schemas/` and reused across routes and tests.

---

#### Step 2 — Privy Authentication Integration

**Why now:** This is the trust boundary. Get it wrong and security is theater. Get it right and every other module inherits it for free.

**How Privy auth works in this system:**

1. Frontend logs in via Privy SDK, receives a Privy access token
2. Frontend sends that token to our backend
3. Backend calls Privy's server-side verification API to validate the token
4. On success, backend looks up or creates a `User` record by `privyUserId`
5. Backend issues its own JWT (15-minute access + 7-day refresh)
6. All subsequent requests use our JWT — Privy is not called again per request

**Middleware `verifyPrivyToken()`** — calls Privy API, returns decoded user identity.
**Middleware `requireAuth()`** — validates our JWT, attaches `req.user` to request.

**Endpoints:**

```
POST   /auth/privy-login     # Verify Privy token → issue JWT
POST   /auth/refresh         # Refresh JWT using refresh token
GET    /auth/me              # Return current user from JWT
POST   /auth/logout          # Invalidate refresh token
```

**JWT payload:** `{ userId, privyUserId, companyId (nullable) }`

**Definition of done:** Postman/Swagger: login with a Privy token → get JWT → call `/auth/me` with JWT → get user back. Invalid token → 401.

---

#### Step 3 — Company Registration

**Why now:** Privy gives us a `userId`. The company profile gives us the employer identity that all jobs and shortlists will reference. Frontend needs this immediately after login.

**Endpoints:**

```
POST   /companies/profile    # Create company (one per user, 409 if exists)
GET    /companies/me         # Get own company profile
PATCH  /companies/me         # Update company profile
```

**Business rules enforced:**
- One company per `userId` — enforced at service layer and DB unique constraint
- `requireAuth()` middleware on all routes
- `companyId` is attached to `req.user` after company is created (consider updating JWT on company creation, or re-fetch from DB on each request — simpler for MVP)

**Definition of done for Week 1:**
- `POST /auth/privy-login` → JWT issued ✓
- `GET /auth/me` → user returned ✓
- `POST /companies/profile` → company created ✓
- `GET /companies/me` → profile returned ✓
- Swagger has all 4 endpoints documented ✓
- Auth middleware blocks unauthenticated requests ✓
- Tests written for auth middleware and company creation ✓

---

### WEEK 2 — JOB + BOND CORE
**Goal:** Employer can create a job, calculate the required bond, fund it gaslessly, and see the job go ACTIVE.

---

#### Step 4 — Job Creation Flow

**Job status lifecycle:**

```
DRAFT → PUBLISHED → ACTIVE → CLOSED
                ↑
        (requires bond funding)
```

- `DRAFT`: Created but not visible. Employer is still editing.
- `PUBLISHED`: Visible but not yet funded. Bond is required to proceed.
- `ACTIVE`: Bond confirmed. Job is searchable. Candidates can be shortlisted.
- `CLOSED`: Manually closed or expired.

**Endpoints:**

```
POST   /jobs/draft           # Create draft job
PATCH  /jobs/:id             # Edit draft (only if DRAFT status)
POST   /jobs/:id/publish     # Move to PUBLISHED (validates required fields)
POST   /jobs/:id/close       # Close active job
GET    /jobs/my              # List employer's own jobs
GET    /jobs/:id             # Get single job
```

**Validation on publish:** title, description, skills, salary range, and location must be populated. Missing fields → 422 with field-level errors.

**Ownership check:** All write operations check `job.companyId === req.user.companyId`. Return 403, not 404, to avoid leaking existence.

---

#### Step 5 — Bond Calculator Service

**Why server-side:** The bond amount must be authoritative from the backend. Frontend should never calculate it — it's a trust mechanism.

**Service:** `calculateBond(salaryRangeMin, salaryRangeMax, currency)`

**Formula for MVP** (configurable via env var):
```
bondAmount = (salaryRangeMax * BOND_PERCENTAGE) / 12
```
Where `BOND_PERCENTAGE` defaults to `10` (10% of max annual salary, pro-rated to 1 month), expressed in USDC.

**Endpoints:**

```
GET    /jobs/:id/bond-estimate    # Returns { usdcAmount, breakdown }
```

The estimate is calculated fresh each time and also stored on the job record when the job is published.

---

#### Step 6 — Alchemy Account Abstraction Integration

**Architecture decision:** Wrap all AA logic in a `WalletService`. No other module imports Alchemy SDK directly.

**`WalletService` methods:**

```javascript
createSmartAccountIfNotExists(userId)   // Idempotent — safe to call multiple times
getWalletAddress(userId)                // Returns stored address or creates first
prepareBondTransaction(jobId, amount)   // Returns { userOp, estimatedGas }
confirmBondTransaction(jobId, txHash)   // Stores hash, marks job ACTIVE
getWalletBalance(userId)               // Returns USDC balance (mockable)
```

**Endpoints:**

```
GET    /wallet/me              # Get or create smart wallet address
GET    /wallet/balance         # USDC balance (mock in dev)
```

**Wallet address** is stored in the `User` or `Wallet` table after first creation. Never recreated if exists.

**Critical implementation note:** The Alchemy SDK `SmartAccountClient` setup is async and expensive. Instantiate once per request context (or cache per userId) — do not instantiate on every middleware call.

**Testing strategy for this module:** Mock the Alchemy SDK entirely using Jest mocks. Tests should not make real RPC calls. The mock returns deterministic fake addresses and fake tx hashes. Real integration is validated manually in staging.

---

#### Step 7 — Fund Bond Endpoint

**This is the most critical endpoint in Week 2.** It stitches together jobs, wallets, bonds, and the blockchain layer.

**Endpoint:**

```
POST   /jobs/:id/fund-bond
```

**Full flow:**

```
1. Authenticate employer
2. Load job — must be PUBLISHED, must belong to employer
3. Check no existing pending bond transaction
4. Call WalletService.prepareBondTransaction(jobId, bondAmount)
5. [Frontend signs UserOperation — or mock this step for hackathon]
6. Call WalletService.confirmBondTransaction(jobId, txHash)
7. Create BondTransaction record in DB with status PENDING
8. Mark job as ACTIVE (for hackathon: do this synchronously on tx submission)
9. Return { job, txHash, status: 'ACTIVE' }
```

**Hackathon simplification:** In production, you'd wait for blockchain confirmation via webhook or polling. For the hackathon, mark the job ACTIVE immediately upon tx submission. Add a comment `// TODO: Replace with confirmation webhook in production`. This is not a shortcut — it is a deliberate, documented MVP decision.

**Definition of done for Week 2:**
- `POST /jobs/draft` → job created ✓
- `POST /jobs/:id/publish` → job published with validation ✓
- `GET /jobs/:id/bond-estimate` → USDC amount returned ✓
- `GET /wallet/me` → smart wallet address returned ✓
- `POST /jobs/:id/fund-bond` → job status = ACTIVE ✓
- All Week 2 endpoints in Swagger ✓
- Tests for job creation and bond funding flow ✓

---

### WEEK 3 — CANDIDATES + SHORTLIST + HARDENING
**Goal:** The full hiring workflow is demonstrable end-to-end. Tests cover all critical paths. Swagger is the demo interface.

---

#### Step 8 — Candidate Seed Data

**Why this matters for demo:** Without real-looking data, the search and shortlist features appear broken even when they work. Invest 2–3 hours here — it pays off during the demo.

**Seed 100 fake candidates** using `@faker-js/faker`:

Each candidate should have:
- Realistic name, email, country
- 3–8 skills from a fixed pool (Solidity, TypeScript, React, Node.js, Python, Rust, Go, etc.)
- TalentProof score (0–100, weighted towards 60–90 for realistic data)
- Experience level (JUNIOR, MID, SENIOR)
- Hourly rate / salary expectation
- Short bio

**Seed command:** `npx prisma db seed` — idempotent (check if candidates exist before inserting).

---

#### Step 9 — Candidate Search API

**Design principle:** Keep this fast and simple. Use Prisma's `where` clause — no Elasticsearch, no full-text search engine for MVP.

**Endpoint:**

```
GET    /candidates/search
```

**Query parameters:**

| Param | Type | Behavior |
|-------|------|----------|
| `skills` | `string[]` | Array overlap — candidate has at least one matching skill |
| `country` | `string` | Exact match (case-insensitive) |
| `keyword` | `string` | Partial match on name, title, or bio |
| `minScore` | `number` | TalentProof score filter |
| `page` | `number` | Pagination (default: 1) |
| `limit` | `number` | Page size (default: 20, max: 50) |

**Response shape:**

```json
{
  "success": true,
  "data": {
    "candidates": [...],
    "total": 87,
    "page": 1,
    "totalPages": 5
  }
}
```

**Performance note:** With 100 seeded candidates and Prisma's default query executor, no indexes are needed for MVP. Add a note in code for production indexing on `skills`, `country`, and `talentProofScore`.

---

#### Step 10 — Shortlist Flow

**Endpoints:**

```
POST   /jobs/:id/shortlist/:candidateId    # Add candidate to job shortlist
DELETE /jobs/:id/shortlist/:candidateId    # Remove candidate
GET    /jobs/:id/shortlist                 # Get full shortlist for a job
PATCH  /shortlist/:entryId/status          # Update status of shortlist entry
```

**Shortlist entry statuses:**
`ADDED → CONTACTED → INTERVIEW_SCHEDULED → OFFER_SENT → REJECTED`

**Business rules:**
- Only the job owner can manage its shortlist
- No duplicate candidates per job (unique constraint on `jobId + candidateId`)
- Job must be ACTIVE to add to shortlist (or PUBLISHED — configurable)
- Max shortlist size: 50 candidates per job (configurable constant)

**Response for shortlist GET:** Includes full candidate object nested, not just IDs.

---

#### Step 11 — Testing

**Testing philosophy for hackathon:** Don't test everything. Test the things that, if broken, would cause a demo failure or cause the frontend to be unblockable.

**Test stack:** Jest + Supertest + test PostgreSQL database (separate from dev DB via `DATABASE_URL_TEST` env var).

**Test setup:** `beforeAll` runs migrations and seed, `afterAll` cleans up. Each test suite resets relevant tables.

**Tests to write:**

**Auth middleware (unit):**
- Valid JWT → `req.user` populated
- Missing token → 401
- Expired token → 401
- Tampered token → 401

**Company creation (integration):**
- Create company → 201 with company data
- Create duplicate company → 409
- Create without auth → 401

**Job lifecycle (integration):**
- Create draft → 201
- Publish valid job → status = PUBLISHED
- Publish incomplete job → 422 with field errors
- Edit another employer's job → 403

**Bond funding (integration):**
- Fund bond on PUBLISHED job → status = ACTIVE
- Fund bond on already ACTIVE job → 409
- Fund bond on another employer's job → 403

**Candidate search (integration):**
- Search with skills filter → only matching candidates returned
- Search with keyword → partial name match works
- Pagination works correctly

**Shortlist (integration):**
- Add candidate → shortlist entry created
- Add duplicate candidate → 409
- Get shortlist → returns nested candidate data
- Update status → status updated

**Target:** 30–40 tests, all passing. Coverage is not the goal — confidence in critical paths is.

---

#### Step 12 — Swagger Completion

**Make Swagger the demo interface.** At demo time, the judge should be able to open Swagger and run through the entire employer flow without a frontend.

**Per endpoint, document:**
- Request body with example values
- All response codes (200, 201, 400, 401, 403, 404, 409, 422)
- Response body schema
- Auth requirement (🔒 lock icon)

**Add a Swagger description at the top** explaining the flow:
`Auth → Create Company → Create Job → Fund Bond → Search Candidates → Shortlist`

**Add example requests** that represent the demo scenario — judges can hit "Try it out" and follow the flow.

**Definition of done for Week 3:**
- 100 candidates seeded ✓
- Candidate search returns filtered results ✓
- Shortlist add/get/update works ✓
- 30+ tests passing ✓
- Swagger documents all endpoints ✓
- Full employer flow runnable in Swagger ✓
- No 500 errors in the demo flow ✓

---

## 4. WHAT TO MOCK vs. WHAT MUST BE REAL

### Must Be Real

| Component | Reason |
|-----------|--------|
| Privy token verification | The auth boundary — mocking this defeats the purpose of the security layer |
| JWT issuance and validation | Core security; trivial to implement correctly |
| PostgreSQL database | All data must persist; in-memory DB creates false confidence |
| Job lifecycle state machine | The core business logic of the platform |
| Bond calculation (server-side) | The trust mechanism — must be authoritative |
| Candidate search filters | Will be live-demonstrated with real data |
| Shortlist CRUD | Will be live-demonstrated |

### Acceptable to Mock

| Component | What to Mock | Why Acceptable |
|-----------|-------------|----------------|
| Blockchain confirmation | Skip waiting for on-chain confirmation; mark ACTIVE on tx submission | Confirmation latency is 10–30s; unacceptable for live demo |
| Gas sponsorship | Return hardcoded `gasSponsor: true` | Alchemy Gas Manager setup is infra config, not code logic |
| Wallet USDC balance | Return a hardcoded balance for demo wallet | Balance checking requires live chain query; irrelevant to hiring flow |
| Transaction receipt | Store a fake tx hash (still store it!) | Receipt polling requires a webhook; out of scope for 3-week hackathon |
| Email/notification | Log to console instead of sending | Notification infrastructure is post-MVP |

**Mocking philosophy:** Mock at the infrastructure boundary (the Alchemy SDK call), not at the business logic level. The job still goes ACTIVE, the tx hash is still stored, the flow still works — we just don't wait for chain finality. This is an explicit, documented MVP decision, not a bug.

---

## 5. RISKS & MITIGATION

### Risk 1 — Privy Integration Takes Longer Than Expected

**Probability:** Medium. Privy's docs are good but server-side verification has edge cases.

**Impact:** High. Everything else is blocked.

**Mitigation:** Spike Privy integration on Day 1 of Week 1 — before writing any other code. Create a minimal proof-of-concept: receive a token, verify it, return user identity. If it works in 2 hours, you're safe. If it takes 6+ hours, escalate immediately and consider building with a mock Privy middleware that accepts a test user ID header for local development, then swap in real Privy before demo.

---

### Risk 2 — Alchemy AA Complexity Blows the Week 2 Schedule

**Probability:** High. AA SDK has significant setup complexity: bundler config, paymaster config, chain selection, gas estimation.

**Impact:** Medium. Bond funding can be simulated.

**Mitigation:** Timebox AA integration to 1 day. If the real SDK isn't working by end of Day 2 of Week 2, switch to a mocked `WalletService` that returns fake addresses and fake tx hashes. The interface stays the same — swap in real implementation later. **Do not let AA complexity derail job creation or bond calculation logic**, which are the more important business features.

---

### Risk 3 — Overbuilding the Blockchain Layer

**Probability:** High. Blockchain is exciting and easy to over-engineer.

**Impact:** Medium. Time is the casualty.

**Mitigation:** The blockchain layer for this MVP does exactly three things: (1) create a smart wallet address, (2) submit a gasless USDC transfer, (3) store the tx hash. Nothing else. No event listeners, no balance polling, no multi-sig, no NFT integration, no on-chain job posting. If you find yourself implementing any of these, stop — it is out of scope.

---

### Risk 4 — No Seed Data Until Week 3

**Probability:** Low if planned for, High if forgotten.

**Impact:** High. Without candidate data, you cannot demo search or shortlist.

**Mitigation:** Write the seed script at the end of Week 2 (before starting Week 3). It takes 2–3 hours and unblocks all of Week 3's work. Put it in the Week 2 checklist explicitly.

---

### Risk 5 — No Tests Until the End

**Probability:** High. Tests are always the first thing cut under time pressure.

**Impact:** Medium. A demo-day regression in auth or job creation with no tests to catch it is high-stress and usually discoverable by judges.

**Mitigation:** Write tests for each module immediately after building it. Auth tests after Week 1. Bond tests after Week 2. The test suite should be a byproduct of development, not a separate phase. Time-box test writing to 20% of each module's budget. If a module takes 4 hours to build, spend 1 hour on tests.

---

## 6. FINAL MVP CHECKLIST

Use this on demo day (T-1 day) to verify readiness.

### Infrastructure
- [ ] `npm start` boots without errors
- [ ] Database connection healthy on startup
- [ ] All required env vars validated at startup
- [ ] Swagger UI accessible at `/api-docs`
- [ ] Request logging working
- [ ] Error responses follow consistent shape

### Auth Flow
- [ ] `POST /auth/privy-login` with valid Privy token → JWT returned
- [ ] `GET /auth/me` with JWT → user data returned
- [ ] Protected routes return 401 with no/invalid token
- [ ] Refresh token flow works

### Company Flow
- [ ] `POST /companies/profile` → company created
- [ ] `GET /companies/me` → company returned
- [ ] Duplicate company → 409

### Wallet Flow
- [ ] `GET /wallet/me` → smart wallet address returned (real or mock)
- [ ] Wallet address stored in DB and consistent across calls

### Job Flow
- [ ] `POST /jobs/draft` → draft created
- [ ] `PATCH /jobs/:id` → draft updated
- [ ] `POST /jobs/:id/publish` → status = PUBLISHED
- [ ] Invalid publish (missing fields) → 422 with field errors
- [ ] `GET /jobs/my` → employer's jobs listed
- [ ] Cross-employer access → 403

### Bond Flow
- [ ] `GET /jobs/:id/bond-estimate` → USDC amount returned
- [ ] `POST /jobs/:id/fund-bond` → status = ACTIVE
- [ ] Funding already-active job → 409
- [ ] Tx hash stored in DB

### Candidate Search
- [ ] 50+ candidates exist in DB (seeded)
- [ ] `GET /candidates/search` with no filters → paginated results
- [ ] Skills filter → only matching skills returned
- [ ] Country filter → only matching country returned
- [ ] Keyword filter → name/bio partial match works
- [ ] TalentProof scores present in response

### Shortlist Flow
- [ ] `POST /jobs/:id/shortlist/:candidateId` → entry created
- [ ] Duplicate shortlist → 409
- [ ] `GET /jobs/:id/shortlist` → full list with candidate data
- [ ] `PATCH /shortlist/:entryId/status` → status updated

### Tests
- [ ] `npm test` exits 0
- [ ] Auth middleware tests: 4 cases
- [ ] Job creation tests: 3+ cases
- [ ] Bond funding tests: 3+ cases
- [ ] Candidate search tests: 3+ cases
- [ ] Shortlist tests: 3+ cases

### Swagger
- [ ] All endpoints grouped by tag
- [ ] Auth endpoints documented with examples
- [ ] Bond endpoints documented with USDC amounts
- [ ] Search endpoint documented with all query params
- [ ] Can run full employer flow from Swagger UI without frontend

### Demo Flow (dry-run this end-to-end before demo)
1. Open Swagger → `POST /auth/privy-login` → copy JWT → click Authorize
2. `POST /companies/profile` → create company
3. `POST /jobs/draft` → create job
4. `PATCH /jobs/:id` → add salary range
5. `POST /jobs/:id/publish` → publish
6. `GET /jobs/:id/bond-estimate` → note USDC amount
7. `POST /jobs/:id/fund-bond` → job goes ACTIVE
8. `GET /candidates/search?skills=Solidity` → see candidates
9. `POST /jobs/:id/shortlist/:candidateId` → shortlist one
10. `GET /jobs/:id/shortlist` → see shortlist ✓

---
