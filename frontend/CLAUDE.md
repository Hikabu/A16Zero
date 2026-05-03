@AGENTS.md

---

# HireOnChain — Employer Dashboard Spec

**Product:** HireOnChain — Web3 Hiring Platform  
**Scope:** Employer Dashboard (MVP)  
**Version:** v1.0 — MVP Sprint

## Critical Success Metric

An employer must go from signup to a live job posting in **under 10 minutes**. Every interaction, state, and flow must be designed around this.

---

## Routes

| Route | Page | Purpose |
|---|---|---|
| `/dashboard` | Dashboard (Projects Hub) | Main entry point — active hiring projects and overall status |
| `/jobs` | Job Manager | List all jobs, filter, create new |
| `/jobs/:id` | Job Pipeline | Kanban board for a specific job's candidates |
| `/jobs/:id/matches` | Job Matcher | AI-driven candidate matching — Top / Potential / General tabs |
| `/jobs/new` | Job Creation Wizard | Multi-step job creation flow |
| `/shortlist` | Shortlist | Saved high-potential candidates |
| `/interviews` | Interview Manager | Calendar view + interview scheduling |
| `/candidates` | Global Talent Pool | Searchable database of all candidates |
| `/analytics` | Performance Analytics | Hiring pipeline metrics |
| `/finance` | Finance & Escrow | Wallet balance, bond management |
| `/settings` | Settings | Company profile, notifications |

**Navigation:** Persistent sidebar. Active route highlighted. Notification badges on Jobs (pending reviews) and Finance (bond actions needed).

---

## Auth: Privy + Account Abstraction

- Use **Privy** for auth (Email or Google login)
- Use **Alchemy Light Account** for Account Abstraction (AA)
- **Never show "Connect Wallet"** — show "Get Started" or "Sign In"
- On login, silently create an embedded smart account — no seed phrases, no extension pop-ups
- Use **Alchemy Gas Manager** to sponsor all transactions (gasless for employer)
- Employers only need USDC for the bond itself

**UI rules:**
- No truncated addresses (`0x123...abc`) in the main header — show Company Name or Email
- Wallet address only in Settings > Billing, labeled "Billing Account ID"
- Show "Available Funds" in USDC with a `$` sign
- Auth states: `Logged Out` | `Authenticating` | `Logged In`
- Onboarding is complete only after sign-in + basic company details provided
- Store JWT in memory — **not localStorage**

---

## Job Creation Wizard (Multi-Step)

Sequential steps — each must be completed before proceeding. Progress indicator at top. Back navigation allowed. Progress saved client-side. On refresh mid-flow, show dialog: *"You have an unsaved job draft. Continue?"*

| Step | Name | What Happens |
|---|---|---|
| 1 | Job Details | Title, department, location (remote/onsite/hybrid), description, required skills |
| 2 | Requirements | Experience level, employment type, application deadline |
| 3 | Bond Setup | Show bond amount calculated from salary range. Employer reviews and confirms. |
| 4 | Fund Bond | Trigger wallet transaction to lock bond in escrow. Show pending → confirmed state. |
| 5 | Review & Publish | Summary. Confirm to publish. Job goes live only after bond is confirmed. |

---

## Bond Calculator (Step 3)

Bond amount comes from backend — **do not let employer edit it**.

Display:
- Salary range entered: $X — $Y
- Bond required: Z USDC
- Brief copy: "This protects candidates from ghost jobs"

---

## Funding Flow (MVP Placeholder)

- "Fund Bond" button triggers Privy wallet signing request
- While awaiting signature: button disabled, shows spinner
- On success: `bond_status` → `staked`, job → `Active`
- On failure/rejection: inline error "Transaction failed. Please try again."
- "Buy USDC" button → opens modal with "Coming soon" — **no real fiat flow in MVP**

---

## Bond States

Every job has a `bond_status` field. Display consistently across all pages:

| State | Meaning | Visual |
|---|---|---|
| `pending` | Bond not yet funded | Orange badge: "Awaiting Funding" |
| `staked` | Bond locked in escrow, job active | Green badge: "Bond Active" |
| `released` | Hiring complete, bond returned | Grey badge: "Bond Released" |
| `forfeited` | Employer violated terms | Red badge: "Bond Forfeited" |

---

## 48-Hour Review Timer

When a candidate is moved to "Review" stage, a 48h countdown timer starts. **Source from backend `review_deadline` field — do not calculate client-side.**

- Show on candidate card (Review column only) and Candidate Profile page
- Format: "31h 14m remaining"
- Under 4 hours: warning color state
- Expired: show "Overdue", candidate card gets distinct overdue styling
- Expired timers appear on Dashboard as actionable alerts

---

## Applicant Pipeline (Kanban)

Drag-and-drop (use `react-beautiful-dnd`). On drop: optimistic UI update, then PATCH candidate stage to backend.

| Stage | Who is Here | Key Actions |
|---|---|---|
| Applied | New applicants (max 100) | Move to Review / Reject |
| Review | Active consideration, 48h timer running | Schedule Interview / Reject |
| Interview | Interview booked or completed | Move to Offer / Reject |
| Offer | Offer extended | Mark Hired / Reject |
| Hired | Role filled | Triggers bond release flow |
| Rejected | Declined | View only |

When applicant_count reaches 100: show "Full (100/100)" on Applied column header. Backend blocks new applications — frontend just displays the state.

---

## Candidate Card (Pipeline)

Each card shows:
- Candidate name + role applied for
- KYC status badge: `Verified` | `Pending` | `Failed`
- Time since application
- 48h timer (Review column only)
- Action menu: move stage or reject

---

## Candidate Profile Page

Data from backend:
- Personal info: name, location, headline
- KYC status (display only)
- Resume / work history (structured data, not a file)
- Skills list
- Stage history log: stage, changed_at, changed_by
- Current stage with action buttons (move forward / reject)
- Interviews inline (if any exist)

---

## Interview Scheduling

- Date + time picker
- Interview type: Video / Phone / In-person
- Optional notes field
- On submit: POST to backend, candidate moves to Interview stage
- List sorted by date
- Statuses: `scheduled` | `completed` | `cancelled`
- **No calendar integrations in MVP** (Google/Outlook — display only)

---

## Page-by-Page Behavior

### Dashboard (`/dashboard`)
- Active jobs count (links to /jobs)
- Total candidates in pipeline
- Wallet balance (USDC)
- Urgent actions: overdue 48h timers, unfunded jobs, offers pending response
- Recent activity feed: last 5–10 events
- Empty state: single CTA — "Post your first job"

### Job Manager (`/jobs`)
- List: title, status, applicant count, bond status
- Filter bar: by status, by department
- Each row links to `/jobs/:id`
- "+ New Job" button → `/jobs/new`
- Empty state: "No jobs yet. Post your first role."

### Finance & Escrow (`/finance`)
- Wallet address (truncated — only here, not in header)
- Current balance (USDC)
- Bond list: job title, bond amount, bond_status, date staked
- "Add Funds" button → Privy deposit flow
- Transaction history: date, type, amount
- Totals: total staked, total released

### Analytics (`/analytics`)
- Total jobs posted, total candidates reviewed, hire rate, avg time-to-hire
- Per-job funnel: Applied → Review → Interview → Offer → Hired
- All data from backend — **no client-side calculations**
- Empty state if < 1 completed hire: "Complete your first hire to see analytics"

---

## States Every Page Must Handle

| State | What to Show |
|---|---|
| Loading | Skeleton loader (not a full-page spinner) |
| Empty | Contextual empty state with primary CTA |
| Error | Inline error message + Retry button |
| Success | Normal page content |

**Never show a blank white page.**

---

## Data Contracts

### Job Object
```ts
{
  id: string
  title: string
  department: string
  location_type: 'remote' | 'onsite' | 'hybrid'
  description: string
  skills: string[]
  status: 'draft' | 'active' | 'paused' | 'closed'
  bond_status: 'pending' | 'staked' | 'released' | 'forfeited'
  bond_amount: number // USDC
  applicant_count: number // max 100
  created_at: string // ISO 8601
  published_at: string | null
  closed_at: string | null
}
```

### Candidate Object
```ts
{
  id: string
  name: string
  headline: string
  location: string
  kyc_status: 'verified' | 'pending' | 'failed'
  current_stage: 'applied' | 'review' | 'interview' | 'offer' | 'hired' | 'rejected'
  review_deadline: string // ISO 8601 — source of 48h timer
  stage_history: { stage: string; changed_at: string; changed_by: string }[]
  skills: string[]
  experience: object[]
}
```

### Wallet / Finance Object
```ts
{
  wallet_address: string
  balance: string // USDC as string to avoid float issues
  transactions: { id: string; type: string; amount: string; status: string; created_at: string }[]
  bonds: { job_id: string; job_title: string; amount: string; bond_status: string; staked_at: string }[]
}
```

---

## Analytics Events (Segment or equivalent)

| Event | Trigger |
|---|---|
| `onboarding_completed` | Employer completes wallet connect + company setup |
| `job_creation_started` | Employer opens /jobs/new |
| `job_creation_step_completed` | Each wizard step completed (pass step number) |
| `job_published` | Job goes live after bond confirmed |
| `bond_funded` | Bond transaction confirmed |
| `candidate_stage_moved` | Candidate moved between pipeline stages |
| `candidate_rejected` | Candidate marked as rejected |
| `interview_scheduled` | Interview created and saved |
| `offer_extended` | Candidate moved to Offer stage |
| `hire_confirmed` | Candidate marked as Hired |
| `timer_expired_viewed` | Employer views candidate with expired 48h timer |
| `finance_page_viewed` | User visits /finance |
| `add_funds_clicked` | User clicks Add Funds |

---

## Out of Scope for MVP

Do **not** build:
- Fiat on-ramp (show placeholder "Coming soon" only)
- Calendar integrations (Google/Outlook)
- Email notification UI
- Candidate messaging / chat
- Team member permissions (single user per company)
- Mobile-responsive design (desktop-first)
- Dark mode
- Custom pipeline stages (6 stages are fixed)
- AI candidate scoring (display raw data only)
- Job template library

---

## Technical Notes

- **API base URL:** `NEXT_PUBLIC_API_BASE_URL` environment variable
- **Timestamps:** All from backend are ISO 8601 UTC — display in employer's local timezone
- **Bond amounts:** Always USDC, format as `$2,400 USDC`
- **100-applicant cap:** Enforced by backend — frontend displays state only
- **KYC:** Verified externally — employer cannot trigger or modify
- **Drag-and-drop:** `react-beautiful-dnd` recommended — optimistic update on drop, then PATCH
- **JWT:** Store in memory only, never localStorage
