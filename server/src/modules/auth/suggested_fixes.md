# Suggested Fixes for Auth Module

Based on the [Security Analysis](./security_analysis.md), here are the recommended code-level improvements.

## 1. Secure Account Linking (Immediate Priority)

Replace the predictable `user.id` state with a secure, server-verified token.

### Proposed Changes to `AuthService`:
```typescript
// Add to AuthService
async generateLinkState(userId: string): Promise<string> {
  const state = crypto.randomBytes(16).toString('hex');
  await this.redis.set(`link_state:${state}`, userId, 'EX', 300); // 5 min expiry
  return state;
}

// Update linkOAuth to verify state ownership
async linkOAuth(userId: string, profile: any, provider: Provider, state: string) {
  const storedUserId = await this.redis.get(`link_state:${state}`);
  if (!storedUserId || storedUserId !== userId) {
    throw new UnauthorizedException('Invalid or expired link state');
  }
  await this.redis.del(`link_state:${state}`);
  
  // Proceed with linking...
}
```

### Proposed Changes to `AuthController`:
```typescript
@Get('github/link')
async linkGithub(@Req() req: any) {
  const state = await this.authService.generateLinkState(req.user.id);
  const base = this.config.get('app.url');
  const path = this.config.get('auth.githubLinkCallback');
  return {
    url: `${base}${path}?state=${state}`,
  };
}

@Get('github/link/callback')
linkGithubCallback(@Req() req: any) {
  // Use the secure state and the currently authenticated session ID
  return this.authService.linkOAuth(req.session.userId, req.user, 'GITHUB', req.query.state);
}
```

---

## 2. Robust Error Handling

Use NestJS built-in exceptions to ensure correct HTTP status codes are returned to the frontend.

### Proposed Changes to `AuthService.completeOnboarding`:
```typescript
import { ConflictException, BadRequestException } from '@nestjs/common';

// ...
if (exists) {
  throw new ConflictException('Username already taken');
}

// Also check for email existence to avoid 500 from Prisma
const emailExists = await this.prisma.user.findUnique({ where: { email: oauth.email } });
if (emailExists) {
  throw new ConflictException('Account with this email already exists');
}
```

---

## 3. Improved Onboarding Privacy

Instead of putting all PII in the JWT, use a "claim" pattern.

- Store the normalized OAuth profile in Redis under a short-lived key.
- Put only the `claimId` in the `tempToken`.
- This prevents exposure of emails/names in a client-side token and makes the token smaller.

---

## 4. Schema Improvements

Consider adding an `emailVerified` boolean to the `User` model. This allows `oauthLogin` to safely link accounts ONLY if the provider confirms the email is verified, or to flag the account for manual verification if it's a first-time link by email.
