# Auth System Security & Architecture Audit

## 1. Final Verdict: Partially Ready (Critical Findings)

The system is architecturally well-structured (modular, uses Redis for temporary state, includes MFA), but it currently contains **critical security vulnerabilities** that would prevent a safe production launch. Specifically, the MFA and email verification enforcements are bypassable, and there is a high risk of account takeover via OAuth auto-linking.

---

## 2. Critical Issues (Ranked)

### 🚨 [CRITICAL] MFA Bypass via OAuth
The `oauthLogin` path issues JWT tokens immediately after finding or linking a user, skipping the `mfaEnabled` check used in the local login flow. An attacker who compromises a linked OAuth account can bypass TOTP entirely.

### 🚨 [CRITICAL] Account Takeover via Auto-Linking
`oauthLogin` auto-links to existing accounts by email without checking if the existing local account's email is verified. An attacker can register `target@gmail.com` locally, and if the victim later logs in with Google, the attacker's account is linked, potentially giving them persistent access if they've already set up a session.

### ⚠️ [HIGH] Unverified Local Access
The `register` and `login` flows do not block token issuance for unverified users. This allows attackers to flood the system with unverified accounts that can still interact with protected API endpoints.

### ⚠️ [MEDIUM] Weak Session Controls (Refresh Rotation)
The system lacks refresh token rotation. Stolen refresh tokens remain valid until their expiration, even if used to generate new access tokens. There is also no "revoke all sessions" capability beyond deleting the current user's Redis key.

### 📉 [LOW] Missing Audit Logs
Lack of visibility into critical security events (failed login, MFA activation, account linking).

---

## 3. Corrected Flows

### A. Local Registration + Verification
1. User registers → `isEmailVerified: false`.
2. Issue **Limited Token** (scope: `verification_only`) or no token.
3. User confirms OTP → Set `isEmailVerified: true`.
4. Only THEN allow full session creation.

### B. Secure Login (Internal Method)
Create a private `handleLoginResponse(user)` method to unify enforcement:
```typescript
private async handleLoginResponse(user: User) {
  if (!user.isEmailVerified) {
    return { needsVerification: true, email: user.email };
  }
  if (user.mfaEnabled) {
    const mfaToken = this.jwt.sign({ sub: user.id, type: 'mfa' }, { expiresIn: '5m' });
    return { mfaRequired: true, mfaToken };
  }
  return this.issueTokens(user.id);
}
```

### C. Secure OAuth Linking
1. Find user by email.
2. If match found: **Only auto-link if `user.isEmailVerified === true`**.
3. If unverified, throw error or require local login first to prove ownership.

---

## 4. Architecture Recommendation: "Clean Version"

| Component | Standard Policy |
| :--- | :--- |
| **User Creation** | **Local**: At registration. **OAuth**: Only after onboarding completion (using Redis claims). |
| **Verification** | Require `isEmailVerified` for ALL protected routes via a global `VerificationGuard`. |
| **MFA** | Enforce in a unified post-auth handler for both Local and OAuth paths. |
| **Profiles** | Create `DeveloperProfile` inside `completeOnboarding` transactionally with the `User`. |

---

## 5. Security Improvements Checklist

- [ ] **MFA Consistency**: Ensure `oauthLogin` results in MFA prompt if enabled.
- [ ] **OAuth Safety**: Implement `verified_email` check in Passport strategies.
- [ ] **Refresh Rotation**: Issue a new Refresh Token on every `/refresh` call and invalidate the old one.
- [ ] **Rate Limiting**: Add per-identifier (email/IP) lockout logic in `AuthService` (e.g., 5 attempts → 15min block).
- [ ] **Verification Guard**: Add a `VerifiedGuard` to all sensitive domain routes (Scorecards, CVs).
- [ ] **Audit Trail**: Log `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `MFA_BYPASS_ATTEMPT`, `ACCOUNT_LINKED`.
- [ ] **Secure Cookies**: If used, set `HttpOnly`, `Secure`, `SameSite=Strict`.
