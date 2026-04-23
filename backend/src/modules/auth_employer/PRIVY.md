```bash

┌─────────────────────────────────────────────────────┐
│ Frontend (User Browser)                             │
│ - Privy React Component                             │
│ - User clicks "Login with Wallet"                   │
│ - Privy manages wallet connection                   │
└────────────────┬────────────────────────────────────┘
                 │ Frontend calls Privy SDK
                 │ Receives accessToken (JWT)
                 │
                 ├─► POST /auth/login
                 │   Authorization: Bearer <accessToken>
                 │
┌────────────────▼────────────────────────────────────┐
│ Backend (AuthService)                               │
│ 1. Verify Privy JWT token                           │
│ 2. Fetch user profile from Privy API                │
│ 3. Extract wallet address from linked accounts      │
│ 4. Upsert Company record (key: walletAddress)       │
│ 5. Return new JWT (backend token)                   │
└──────────────────────────────────────────────────────┘
```

# Privy + Auth Service (Simple Explanation)

## Big picture

Users log in with their crypto wallet using **Privy**.
Your backend checks the Privy token, gets the user wallet, creates/updates a company in DB, and gives its own JWT token for future requests.

Flow in one sentence:

**Wallet login → Privy token → Backend verifies → Company created/updated → Backend JWT returned**

---

# Full Login Flow (Simple Steps)

## 1) User logs in on frontend

User clicks **“Login with wallet”**.

Privy:

* opens login popup
* connects wallet (Metamask etc.)
* returns a **Privy accessToken (JWT)**

Frontend sends this token to backend:

```
POST /auth/login
Authorization: Bearer <privyToken>
```

---

## 2) Backend verifies Privy token

Backend checks the token is real and not expired.

From the token we get:

* privyId (user id in Privy)
* email (optional)

If token is invalid → **401 Unauthorized**

---

## 3) Backend asks Privy for full user profile

Backend calls Privy API:

```
GET /v1/users/{privyId}
```

Privy returns linked accounts:

* wallet address
* email
* socials etc.

We only care about the **wallet address**.

If no wallet → login rejected.

Why wallet is important?
Because in Web3 **wallet = identity**.

---

## 4) Extract wallet address

Backend finds wallet in linked accounts:

```
0xABC123...
```

If wallet not found → 401 error.

---

## 5) Create or update company (Upsert)

We use walletAddress as the **unique key**.

Two possible cases:

### First login (new wallet)

Create company:

* walletAddress
* privyId
* email
* default name & country

### Returning user (same wallet)

Update company:

* update privyId if changed
* update email if changed
* do NOT create duplicates

This prevents database errors and duplicates.

---

## 6) Backend creates its own JWT

Important:
Privy token is NOT used after login.

Backend generates **its own JWT** containing:

* companyId
* walletAddress
* privyId

Frontend saves this token and uses it for all API calls.

---

## 7) User is now authenticated

Future requests:

```
Authorization: Bearer <backendJWT>
```

Backend reads companyId from token and loads company data.

---

# Why this design?

### Why use wallet as unique key?

Because wallet:

* never changes
* proves ownership
* prevents duplicates
* fits Web3 identity

### Why always fetch user from Privy?

User may link a new wallet later.
Fetching every login keeps data synced.

### Why Upsert?

Without upsert:

* second login would crash DB (duplicate wallet)
  With upsert:
* new user → create
* existing user → update

---

# Common errors (simple)

**401 Unauthorized**
```bash
POST /auth/login with invalid/expired token
↓
verifyToken() fails
↓
throw UnauthorizedException('Invalid Privy token')
↓
Response: 401 Unauthorized
```
* token invalid
* user has no wallet in Privy

**no wallet linked in Privy**
```bash
User has Privy account but hasn't linked a wallet yet
↓
privyUser.linked_accounts has no wallet type
↓
walletAddress = undefined
↓
throw UnauthorizedException('No wallet linked to Privy user')
↓
Response: 401 Unauthorized
↓
Frontend: Show message "Please link a wallet in Privy first"
```

**500 Error**

* Privy API not reachable
```bash
getUser(privyId) fails
↓
Privy API timeout or error
↓
Exception bubbles up (or you catch and throw 500)
↓
Response: 500 Internal Server Error
↓
Frontend: Retry login or contact support
```


---

# Environment variables

Backend needs:

```
PRIVY_API_KEY=
PRIVY_APP_ID=
JWT_SECRET=
```

Frontend needs:

```
PRIVY_APP_ID=
API_URL=
```

---

# Super short summary

1. User logs in with wallet via Privy
2. Frontend sends Privy token to backend
3. Backend verifies token and fetches wallet
4. Company is created or updated in DB
5. Backend returns its own JWT
6. Frontend uses this JWT for future requests

