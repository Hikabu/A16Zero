# Colosseum: Frontend API User Flows

This document details the standard sequences of API calls required to implement major user journeys in the frontend. It is designed so UI/UX developers can build screens without needing to understand deep backend mechanics.

---

## Flow A: Candidate Authentication & Profiling

**Goal:** Allow a developer to sign up, sync their GitHub/Web3 data, and view their live generated scorecard.

1.  **Authentication**
    *   `POST /auth-candidate/github` (or `/auth-candidate/wallet`)
    *   **Response:** JWT token for subsequent requests. Include in `Authorization: Bearer <token>` header.
2.  **Fetch Profile**
    *   `GET /profile-candidate/me`
    *   **Response:** Basic user data (name, avatar, sync status).
3.  **Trigger Data Ingestion (If needed)**
    *   `POST /github-sync/trigger`
    *   **Note:** This kicks off background processing. Polling `/profile-candidate/me` can verify completion.
4.  **View Live Scorecard**
    *   `GET /scorecard/me`
    *   **Response:** The full, live technical evaluation of the candidate. This is the "Proof of Talent" profile.

---

## Flow B: Reputation & Vouching (Candidate)

**Goal:** Candidates send vouch requests to peers to boost their `confidenceTier`.

1.  **Check Vouch Status**
    *   `GET /vouchers/me`
    *   **Response:** Lists active vouches, pending requests, and current confidence modifiers.
2.  **Create Vouch Request Link**
    *   `POST /vouchers/request`
    *   **Response:** Returns a shareable URL/token to give to a peer.
3.  **Process Webhook (Backend Automatic)**
    *   When the peer completes the on-chain vouch transaction, Helius hits `/vouchers/webhook`. The frontend does not need to call this. The candidate's `confidenceTier` is automatically updated on their next scorecard fetch.

---

## Flow C: Job Creation & Setup (Employer)

**Goal:** An employer drafts a job description, uses AI to extract requirements, confirms them, and publishes the job.

1.  **Authentication**
    *   `POST /auth-employer/login` (Standard email/password JWT).
2.  **Create Draft Job**
    *   `POST /jobs`
    *   **Body:** `{ "title": "Senior Rust Dev", "description": "Raw unstructured text..." }`
    *   **Response:** `JobPost` object with `status: "DRAFT"`.
3.  **AI Requirements Parsing**
    *   `POST /jobs/{jobId}/parse-jd`
    *   **Response:** An AI-generated JSON blob suggesting `requiredSkills`, `roleType`, `seniorityLevel`, and scoring weights. Display this to the HR user to review.
4.  **Confirm Requirements**
    *   `POST /jobs/{jobId}/confirm-requirements`
    *   **Body:** The potentially edited JSON blob from Step 3.
    *   **Note:** This step is mandatory! It writes the typed columns needed for ATS filtering.
5.  **Publish Job**
    *   `POST /jobs/{jobId}/publish`
    *   **Response:** Updates status to `ACTIVE`.

---

## Flow D: Job Application (Candidate)

**Goal:** A candidate searches for a job, previews how their profile matches the requirements, and applies.

1.  **Browse Public Jobs**
    *   `GET /jobs`
    *   **Query Params:** `?search=X&roleType=Y&isWeb3=true`
    *   **Response:** Paginated list of active jobs.
2.  **View Job Details & Gap Preview**
    *   `GET /jobs/{jobId}` (Job basic info)
    *   `GET /applications/me/gap-preview?jobId={jobId}`
    *   **Response:** Returns `matchedTechnologies` and `missingTechnologies`. Use this to show the candidate a "Should I apply?" warning screen.
3.  **Submit Application**
    *   `POST /applications/me/{jobId}`
    *   **Note:** This action *freezes* the candidate's current scorecard. Even if they update their GitHub later, the employer will only see the data from this exact moment.

---

## Flow E: ATS Management (Employer)

**Goal:** HR and CTO users review incoming applications and move candidates through the hiring pipeline.

1.  **List Applications for Job**
    *   `GET /applications/hr/jobs/{jobId}`
    *   **Response:** Array of applicants. Every applicant object contains two blocks:
        *   `hrView`: Quick summary, verdict, pipeline status.
        *   `technicalView`: Deep GitHub stats, probe questions for CTOs. 
    *   **Frontend Logic:** Render the view appropriate for the logged-in user's role.
2.  **View Single Applicant Detail**
    *   `GET /applications/hr/{applicationId}`
    *   **Response:** Deep dive version of `hrView` and `technicalView`.
3.  **Advance Pipeline Stage**
    *   `PATCH /applications/hr/{applicationId}/stage`
    *   **Body:** `{ "stage": "INTERVIEW_TECHNICAL" }`
    *   **Response:** Updates candidate stage. May trigger automated emails or interview question generation in the background.
4.  **Export Scorecard PDF**
    *   `GET /applications/hr/{applicationId}/scorecard`
    *   **Response:** Raw `text/html`.
    *   **Frontend Logic:** Render this HTML in an invisible iframe or new tab, and automatically call `window.print()` to allow the HR user to save it as a PDF.
