
## 1. What this project is (big picture)

This is an **employer-facing backend API** (title in Swagger: “HireOnChain Employer API”). The idea:

1. A user signs in on the **frontend with Privy** (wallet / social login provider). Privy gives the browser a **Privy access token** (a JWT issued by Privy).
2. The browser sends that token to **`POST /auth/login`**. The backend **verifies** it is really from Privy (using public keys), then **creates or loads a `Company`** row in Postgres tied to that user’s Privy id.
3. The backend issues its **own JWT** (`accessToken`). Almost every other route expects **`Authorization: Bearer <that backend JWT>`**.
4. The app then supports **job posts**, **analytics**, and **mock candidate/shortlist** endpoints for prototyping.

So: **Privy = “who is this person?” once at login.** **Your JWT = “this request is allowed as this company”** on later calls.

---

## 2. How a login request flows (step by step)

| Step | What happens |
|------|----------------|
| 1 | Client calls `POST /auth/login` with header `Authorization: Bearer <Privy access token>` and JSON body with `walletAddress` (and optional `smartAccountAddress`). |
| 2 | `PrivyService` uses the **`jose`** library to verify the Privy JWT against **Privy’s JWKS URL** (public signing keys). It checks issuer `privy.io` and audience = your `PRIVY_APP_ID`. |
| 3 | From the token it reads `sub` → **Privy user id** (`privyId`), and optionally email. |
| 4 | `AuthService` looks up `Company` by `privyId`. If missing, it **creates** a company with placeholder name/country and stores wallet fields. |
| 5 | It signs a **backend JWT** with payload `{ sub: company.id, walletAddress, privyId }` using `@nestjs/jwt` / `JWT_SECRET`. |
| 6 | Client stores `accessToken` and sends it on protected routes. |
| 7 | **`JwtStrategy`** (Passport) reads the backend JWT, takes `payload.sub` as **company id**, loads the `Company` from the DB, and attaches it as **`req.user`**. |

Important detail: **`req.user` is the full `Company` record**, not a generic “user” object.

---

## 3. Libraries and tools — what they are and why they appear here

### Core framework (NestJS)

- **`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`** — **NestJS** is a Node.js framework: modules, controllers, dependency injection, HTTP server on Express.
- **`rxjs`** — Used inside Nest for async streams (Nest is built on this); you rarely touch it directly.

### Config and validation

- **`@nestjs/config`** — Loads **`.env`** into `ConfigService` so secrets and URLs are not hard-coded.
- **`zod`** — In `app.module.ts`, a **schema** validates environment variables at startup (`DATABASE_URL`, `JWT_SECRET`, `PRIVY_APP_ID`, etc.). If something is wrong, the app **fails fast** instead of running half-configured.
- **`dotenv`** — Loads env vars (e.g. in tests).

### Database

- **`@prisma/client`, `prisma` (CLI)** — **Prisma** is an **ORM**: you describe tables in `schema.prisma`, then TypeScript gets type-safe queries like `prisma.company.findUnique(...)`.
- **`pg` + `@prisma/adapter-pg`** — Postgres **driver**; Prisma is configured here with the **driver adapter** pattern (connection pool + adapter in `PrismaService`).

### Auth: Privy + your JWT

- **`jose`** — Used in `PrivyService` to **verify** Privy’s JWT using **JWKS** (`createRemoteJWKSet`, `jwtVerify`). This is standard “verify a third-party JWT” tooling.
- **`@privy-io/node`** — Listed in `package.json` but **the current verification path uses `jose` + JWKS**, not this SDK, in `privy.service.ts`. The package may be intended for future use or other server APIs.
- **`@nestjs/jwt`** — Signs and verifies **your** application JWT after Privy login.
- **`passport`, `@nestjs/passport`, `passport-jwt`** — **Passport** is a popular auth middleware pattern; **`JwtStrategy`** extracts the Bearer token and runs `validate()` to load the company.

### HTTP API docs and DTOs

- **`@nestjs/swagger`** — Serves **Swagger UI** at `/api/docs` so you can try endpoints in the browser.
- **`class-validator` + `class-transformer`** — **DTOs** (e.g. `LoginDto`, `CreateJobDto`) use decorators like `@IsString()`; Nest’s `ValidationPipe` checks incoming JSON. `class-transformer` supports `transform: true` in `main.ts` (e.g. string to number).

### Security and ops

- **`helmet`** — Sets safer HTTP headers (e.g. XSS-related headers).
- **`@nestjs/throttler`** — Rate limiting is **configured** in `AppModule`, but there is **no `ThrottlerGuard` registered** in the code we saw; to actually enforce limits you typically add the guard (globally or per route).

### Web3 / account abstraction (present but not wired to the main app)

- **`@alchemy/aa-core`, `@alchemy/aa-accounts`, `viem`** — Used in `SmartAccountService` to **predict** a **counterfactual smart account address** (Light Account) from a deterministic salt derived from `privyId`. **`Web3Module` exists but is not imported in `AppModule`**, so this service is **not active** in the running API unless you wire it in.

### Other dependencies in `package.json` (not used in `src/` from grep)

- **`argon2`** — Password hashing; **no usage found** in `src/` (likely planned or leftover).
- **`nestjs-pino`, `pino`, `pino-pretty`** — Structured logging; **not wired** in `main.ts` in the current code.

---

## 4. Data model 

Defined in `backend/prisma/schema.prisma`:

- **`Company`** — Employer profile: name, country, optional legal/registration, **`privyId`**, wallet fields, etc.
- **`JobPost`** — Jobs linked to `companyId`, status enum (`DRAFT`, `ACTIVE`, …), bonus amount, etc.
- **`Candidate`**, **`TalentProof`**, **`Shortlist`** — Talent pipeline; analytics counts **shortlists** from the DB; candidate HTTP routes are **mock data** only.

---

## 5. API reference 

Base URL: `http://localhost:<PORT>` (default **3000**).  
Swagger: **`GET /api/docs`**.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/` | **JWT required** (no `@Public`) | Returns `"Hello World!"` — unusual for a root path; normally you’d mark this public for health checks. |
| POST | `/auth/login` | **Public** | Body: `walletAddress`, optional `smartAccountAddress`. Header: `Authorization: Bearer <Privy access token>`. Returns `{ success, data: { accessToken } }`. |
| GET | `/companies/me` | Bearer **backend JWT** | Current company profile (+ job count via `CompaniesService`). |
| POST | `/jobs` | JWT | Create job (`CreateJobDto`). |
| GET | `/jobs/my` | JWT | List this company’s jobs. |
| POST | `/jobs/:id/publish` | JWT | Sets job to published (simulated payment). |
| POST | `/jobs/:id/close` | JWT | Closes job. |
| GET | `/analytics/dashboard` | JWT | `totalJobs`, `activeJobs`, `totalCandidatesShortlisted`. |
| GET | `/candidates` | JWT | **Hard-coded mock** list. |
| POST | `/candidates/shortlist/:jobId/:candidateId` | JWT | **Mock** shortlist response. |
| PATCH | `/candidates/shortlist/:id/status` | JWT | **Mock** status update. |

There is also a **duplicate/unused** module: `company/company.controller.ts` exposes **`GET /company/me`** but **`CompanyModule` is not imported in `AppModule`**, so that route is **not part of the live app** unless you register it.

---

## 6. Privy 

- **Privy** handles login; your backend **does not** store Privy passwords.
- Verification uses **Privy’s JWKS** URL (default pattern: `https://auth.privy.io/api/v1/apps/<PRIVY_APP_ID>/jwks.json` unless `PRIVY_JWKS_URL` overrides).
- Required env: **`PRIVY_APP_ID`**, **`JWT_SECRET`** (long random string), **`DATABASE_URL`**.

**Testing login with a real Privy token**

1. In the Privy dashboard, create an app and note **`PRIVY_APP_ID`**.
2. Build a minimal frontend with Privy SDK, log in, and read the **access token** the SDK gives you (often called access token or identity token depending on version — here the backend expects what Privy documents as the **verifiable JWT** for server verification).
3. Call:

```http
POST /auth/login
Authorization: Bearer <Privy JWT>
Content-Type: application/json

{"walletAddress":"0xYourWallet","smartAccountAddress":"0xOptional"}
```

4. Copy `data.accessToken` and call e.g. `GET /companies/me` with `Authorization: Bearer <accessToken>`.

If verification fails, check: clock skew, wrong `PRIVY_APP_ID`, token expired, or token not the JWT meant for backend verification.

---

## 7. Tests in the repo and how to run them

**Unit tests:** `backend/src/app.controller.spec.ts` (minimal).

**E2E:** `backend/test/auth.e2e-spec.ts` — **Mocks `PrivyService`** so **no real Privy token** is needed. It still uses a real DB connection via `AppModule`, so you need **`DATABASE_URL`** (and migrations applied) for these tests to work reliably.

Commands (from `backend/`):

- `npm run test` — unit tests  
- `npm run test:e2e` — e2e  

The e2e file already demonstrates:

- Login → JWT returned  
- `GET /companies/me` with JWT  
- `POST /jobs` with JWT  
- `GET /analytics/dashboard` with JWT  
- Unauthenticated request → **401**

**Suggested extra tests (not yet in repo)**

1. **Invalid / missing Privy token** on `POST /auth/login` → expect **401** (would need to not mock `verifyToken` throwing, or test `PrivyService` in isolation).
2. **Invalid backend JWT** on protected route → **401**.
3. **Job publish/close** ownership: another company’s job id → **404** (as `JobsService` throws).
4. **Validation**: `POST /jobs` with missing `title` → **400** (ValidationPipe).
5. **Integration test** with **real** Privy token (manual or CI secret) — optional smoke test.

---

## 8. Odds and ends

1. **Global JWT guard:** `JwtAuthGuard` is registered as **`APP_GUARD`**, so **every route is protected by default** except those marked with `@Public()` (only `POST /auth/login` today). **`GET /`** is therefore protected unless you add `@Public()` to it.
2. **`apidocks.md`** in the repo describes features (e.g. Prisma 6 wording) that may **not match** the exact code version; trust **`package.json`** and **`schema.prisma`** for versions.
3. **`SmartAccountService`** / Alchemy / viem are **implemented** but **not imported** in `AppModule` — planned for wallet prediction, not active in HTTP handlers yet.
4. **`@privy-io/node`** is a dependency but **verification is implemented with `jose`**.
