# Verification and Recovery Setup — Ownership Across the Auth Seam

## Overview

This guide maps **token verification** and **session recovery** flows across the monorepo authentication stack. It shows how ownership is preserved as sessions move between API, Web, Mobile, and shared contracts.

**Goal:** Enable hackathon teams to understand, extend, and test verification and recovery without reimplementing the pattern in each runtime.

## Shared verification and recovery contracts

All verification and recovery logic depends on shared contracts in `packages/types`:

| Contract | Source | Layer | Purpose |
|----------|--------|-------|---------|
| `AuthSession` | `auth.ts` | Web, Mobile | Deserialized claims: `userId`, `role`, `onboardingCompleted` |
| `SessionRefreshRequest` / `SessionRefreshResponse` | `auth.ts` | API, Web, Mobile | Token rotation: old refresh token → new access + refresh pair |
| `IntrospectResponse` | `auth.ts` | API, Web, Mobile | Token verification without side effects; returns `valid`, `userId`, `role` |
| `SessionContinuityOutcome` | `auth.ts` | Web, Mobile | Bootstrap result: `valid` (session active), `refreshed` (recovered), `expired` (sign-out) |
| `ProtectedRouteGuard` | `session.types.ts` | Web, Mobile | Route authorization result: `userId`, `role`, deny reason |
| `SessionLogoutRequest` / `SessionLogoutResponse` | `auth.ts` | API, Web, Mobile | Token revocation: mark refresh token as invalidated |

## Verification flow — How ownership is validated

### API: `POST /api/v1/auth/introspect`

**Purpose:** Validate an access token and return ownership metadata without issuing new tokens.

**Request:**
```typescript
// Send as Bearer token in Authorization header
Authorization: Bearer <accessToken>
```

**Response (valid token):**
```typescript
{
  "success": true,
  "data": {
    "valid": true,
    "userId": "user-123",
    "role": "PLANNER",
    "iat": 1748800000,
    "exp": 1748803600  // 1 hour from issue
  }
}
```

**Response (invalid/expired token):**
```typescript
{
  "success": true,
  "data": {
    "valid": false
    // No userId, role, or claims to prevent enumeration
  }
}
```

**Key invariant:** Introspection is **read-only** and **ownership-preserving**. The response includes `userId` and `role` for audit compliance but never issues new tokens.

**Implementation:** [apps/api/src/domains/identity/session.service.ts](../apps/api/src/domains/identity/session.service.ts)

---

### Web: `ensureSessionContinuity()`

**Purpose:** Bootstrap session on app load by verifying stored tokens and recovering if needed.

**Location:** [apps/web/auth/session-continuity.ts](../apps/web/auth/session-continuity.ts)

**Input:** Stored `{ accessToken, refreshToken, user }`

**Output:** `SessionContinuityOutcome` with status `'valid'`, `'refreshed'`, or `'expired'`

**Flow:**

```text
1. Check localStorage for stored { accessToken, refreshToken, user }
2. If missing → return { status: 'expired', session: null }
3. Call /api/v1/auth/introspect(accessToken)
   → If valid → return { status: 'valid', session: { ...user } }
   → If invalid → proceed to step 4
4. If refreshToken exists, call POST /api/v1/auth/refresh(refreshToken)
   → If successful → save new pair, return { status: 'refreshed', session: { ...updated user } }
   → If failed → return { status: 'expired', session: null }
```

**Ownership preservation:**

- `user.id` (from storage) is compared with returned `userId` from introspect/refresh
- If mismatch detected, session is rejected (cross-user hijacking prevention)
- All metadata (email, name, role, onboardingCompleted, wallet config) is preserved through refresh

**Contracts used:**
- `IntrospectResponse` — verify stored access token
- `SessionRefreshResponse` — rotate refresh token, get new access token
- `SessionContinuityOutcome` — return status to caller

**Testing:** See [apps/web/auth/session-continuity.test.ts](../apps/web/auth/session-continuity.test.ts)

---

### Mobile: `ensureSessionContinuity()`

**Purpose:** Same as Web — bootstrap on app launch with SecureStore instead of localStorage.

**Location:** [apps/mobile/src/auth/sessionContinuity.ts](../apps/mobile/src/auth/sessionContinuity.ts)

**Flow:** Identical to Web verification flow; storage layer differs (expo-secure-store vs localStorage).

**Ownership preservation:** Same contract-based verification as Web.

**Testing:** See [apps/mobile/src/auth/__tests__/sessionContinuity.test.ts](../apps/mobile/src/auth/__tests__/sessionContinuity.test.ts)

---

## Recovery flow — Refreshing and restoring ownership

### Token rotation — Single-use refresh tokens

**Problem:** Access tokens expire (15 min); refresh tokens are long-lived (7 days) but must rotate on each use to prevent replay attacks.

**API: `POST /api/v1/auth/refresh`**

**Request:**
```typescript
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (success):**
```typescript
{
  "success": true,
  "data": {
    "accessToken": "new-access-jwt",
    "refreshToken": "new-refresh-jwt",
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "role": "PLANNER",
      "onboardingCompleted": false
    },
    "session": {
      "userId": "user-123",
      "role": "PLANNER",
      "onboardingCompleted": false,
      "issuedAt": "2025-06-01T00:00:00Z"
    }
  }
}
```

**Response (invalid refresh token):**
```typescript
{
  "success": false,
  "code": "INVALID_REFRESH_TOKEN",
  "message": "Refresh token is invalid or expired"
}
```

**Key invariants:**

1. **Single-use:** Old refresh token is invalidated before issuing the new pair. Replaying the old token returns a 401.
2. **Ownership preserved:** The `jti` (JWT ID) in the new refresh token is linked to the same `userId` in the database. This ensures concurrent refresh calls from different users cannot collide.
3. **Expiry reset:** New access token has 15m expiry; new refresh token has 7d expiry from issue time.

**Implementation:** [apps/api/src/domains/identity/session.service.ts](../apps/api/src/domains/identity/session.service.ts) — `refreshSession()`

---

### Ownership isolation during refresh — Concurrent user protection

**Scenario:** Two users refresh their tokens at the same time. Can user A's refresh token ever become user B's?

**Answer:** No. The API enforces:

1. The refresh token JWT contains a `jti` (unique ID).
2. The database record `RefreshTokenRecord` maps `jti` → `userId`.
3. On refresh, the service verifies that the decoded `jti` exists in the database AND that the stored `userId` matches the requesting token's claims.
4. If the `jti` exists but points to a different `userId`, the request is rejected.

**Test case:** [apps/api/src/domains/identity/session-ownership.integration.test.ts](../apps/api/src/domains/identity/session-ownership.integration.test.ts) — `"AUTH-065: prevents token confusion when two users refresh concurrently"`

---

### Session restoration on mobile/web app boot

**Scenario:** User closes and relaunches the app. How is the session restored?

**Flow:**

1. **AuthProvider mounts** → calls `ensureSessionContinuity()`
2. **Token verification:**
   - Call `GET /api/v1/auth/introspect` with stored access token
   - If valid (introspect returns `valid: true`) → session is active, stay signed in
3. **Token recovery (if introspection fails):**
   - Call `POST /api/v1/auth/refresh` with stored refresh token
   - If successful → save new tokens, update user metadata, stay signed in
   - If failed → clear storage, redirect to login
4. **Route guarding:** On every route access, `evaluateProtectedRouteGuard()` re-checks ownership:
   ```typescript
   const guard = evaluateProtectedRouteGuard(session);
   if (!guard.authorized) {
     // Redirect to login, show reason (missing_session, no_role, etc.)
   }
   ```

**Ownership preservation across boot:**

- Original `session.userId` from storage is compared with returned claims from introspect/refresh
- If `userId` changes, session is rejected (cross-user hijacking prevention)
- All metadata (role, onboarding state, wallet config) is re-fetched from `/api/v1/auth/introspect` or `/api/v1/auth/refresh` to stay in sync with API state

---

## Protected route guarding — Ownership enforcement at route boundaries

### Shared `ProtectedRouteGuard` contract

**Location:** [packages/types/src/session.types.ts](../packages/types/src/session.types.ts)

```typescript
export interface ProtectedRouteGuard {
  authorized: boolean;
  userId?: string;
  role?: string;
  reason?: 'missing_session' | 'missing_role' | 'invalid_token';
}
```

**Purpose:** Provide a unified vocabulary for route protection across Web and Mobile. The API does not use this contract; it uses bearer token + middleware.

### Web: `evaluateProtectedRouteGuard(session)`

**Location:** [apps/web/auth/session-continuity.ts](../apps/web/auth/session-continuity.ts)

```typescript
const guard = evaluateProtectedRouteGuard(session);
if (!guard.authorized) {
  // Redirect to login with reason (e.g., "missing_session")
  return <LoginPage />;
}
// Render protected content with guard.userId for audit/logging
return <Dashboard userId={guard.userId} role={guard.role} />;
```

**Invariant:** `guard.userId` always matches `session.userId` (or both are missing). This ensures the guard result is consistent with the stored session and prevents race conditions during token refresh.

**Testing:** [apps/web/auth/session-continuity.test.ts](../apps/web/auth/session-continuity.test.ts) — "Route guard ownership" section

---

### Mobile: `evaluateProtectedRouteGuard(session)`

**Implementation:** [apps/mobile/src/auth/sessionContinuity.ts](../apps/mobile/src/auth/sessionContinuity.ts)

**Same contract and invariants as Web.** The shared contract in `packages/types` enables both runtimes to speak the same language without duplicating logic.

---

## Testing verification and recovery — Regression prevention

### Ownership isolation tests

**Goal:** Ensure that one user's tokens cannot be used to claim another user's session.

**Location:** [apps/api/src/domains/identity/session-ownership.integration.test.ts](../apps/api/src/domains/identity/session-ownership.integration.test.ts)

**Key tests:**

- ✅ "AUTH-065: prevents token confusion when two users refresh concurrently"
- ✅ "Rejects refresh token when token jti and record userId mismatch"
- ✅ "Enforces single-use refresh by revoking old token before issuing new pair"

**How to write a similar test:**

```typescript
it('should reject refresh token from different user even if jti exists', async () => {
  // 1. User A logs in, gets refresh token with jti: "abc123"
  const sessionA = await sessionService.createSession(userA);
  const oldRefreshA = sessionA.refreshToken;

  // 2. User B logs in, gets refresh token with jti: "xyz789"
  const sessionB = await sessionService.createSession(userB);

  // 3. API stores: { jti: "abc123", userId: userA.id }
  //               { jti: "xyz789", userId: userB.id }

  // 4. Try to use User A's token while claiming User B's identity
  const decoded = jwt.decode(oldRefreshA); // { jti: "abc123" }
  const maliciousRequest = {
    refreshToken: oldRefreshA, // jti: abc123, but we decode it as User B
  };

  // 5. Service must reject because jti "abc123" is linked to userA, not userB
  const result = await sessionService.refreshSession(maliciousRequest, userB);
  expect(result.success).toBe(false);
});
```

---

### Session continuity recovery tests

**Goal:** Ensure that token refresh preserves user identity, role, and metadata without leaking cross-user state.

**Location:** [apps/web/auth/session-continuity.test.ts](../apps/web/auth/session-continuity.test.ts)

**Key tests:**

- ✅ "Preserves user identity across token refresh"
- ✅ "Preserves user role after refresh recovery"
- ✅ "Returns valid status when token introspection succeeds"
- ✅ "Returns refreshed status when introspection fails but refresh succeeds"
- ✅ "Denies access with missing_session reason when no session exists"

**Pattern for writing recovery tests:**

```typescript
it('should preserve ownership through token refresh', async () => {
  // 1. Initial session
  const session = {
    userId: 'user-1',
    role: 'PLANNER',
    accessToken: expiredToken,
    refreshToken: validToken,
  };

  // 2. Mock introspect to return "expired"
  mockIntrospect.mockResolvedValueOnce({ valid: false });

  // 3. Mock refresh to return new tokens + user metadata
  mockRefresh.mockResolvedValueOnce({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: { id: 'user-1', role: 'PLANNER', ... }, // Same userId!
  });

  // 4. Call recovery
  const outcome = await ensureSessionContinuity(session);

  // 5. Assert ownership is preserved
  expect(outcome.session.userId).toBe('user-1'); // Still user-1
  expect(outcome.session.role).toBe('PLANNER');  // Role unchanged
  expect(outcome.status).toBe('refreshed');
});
```

---

## Running verification tests

### API ownership and recovery tests

```bash
cd apps/api
pnpm test -- session.service.test.ts
pnpm test -- session-ownership.integration.test.ts
```

**What they test:**
- Ownership isolation during concurrent refresh
- Single-use refresh token enforcement
- Introspection without side effects
- Logout idempotence

### Web session continuity tests

```bash
cd apps/web
pnpm test -- session-continuity.test.ts
```

**What they test:**
- Token verification on boot (introspect)
- Token recovery on boot (refresh)
- Ownership preservation through recovery
- Route guard enforcement

### Mobile session continuity tests

```bash
cd apps/mobile
pnpm test -- sessionContinuity.test.ts
```

**What they test:**
- Session restoration with SecureStore
- Ownership preservation across app relaunch
- Multi-user device isolation
- Role-based route guarding

### Full stack verification

```bash
# Install and start all services
pnpm install
cd apps/api && pnpm dev &          # :3001
cd apps/web && pnpm dev &          # :3000
cd apps/mobile && pnpm dev &       # Expo

# In browser or Expo, test the flow:
# 1. Sign up → introspect validates new session
# 2. Reload → introspect succeeds, stay signed in
# 3. Wait 15m (or mock expiry) → reload → refresh rotates tokens, stay signed in
# 4. Sign out → refresh token revoked, storage cleared
```

---

## Setup checklist for contributors

Before extending the auth stack, verify these foundations are in place:

- [ ] **Shared contracts synced:** Run `pnpm typecheck` to ensure Web, Mobile, and API all import from `@themixmatch/types`
- [ ] **Verification tests passing:** `pnpm --filter @themixmatch/api test -- session` ✅
- [ ] **Recovery tests passing:** `pnpm --filter @themixmatch/web test -- session-continuity` ✅
- [ ] **Full stack boots:** `pnpm dev` in all apps completes without auth errors
- [ ] **Protected routes guarded:** Visit `/dashboard` without session → redirects to login ✅
- [ ] **Token refresh works:** Wait for access token expiry → reload → should recover session ✅

---

## Next steps for contributors

### Extending verification (e.g., adding device fingerprinting)

1. Add new fields to `RefreshTokenRecord` in `packages/types/src/auth.ts`
2. Update `session.service.ts` to compute and store the fingerprint on refresh
3. Update introspect/refresh to validate fingerprint matches current device
4. Add test case to ownership integration tests
5. Update this doc with new invariant

### Extending recovery (e.g., rolling back old refresh tokens)

1. Modify `SessionContinuityOutcome` in `packages/types` to include rollback metadata
2. Update `session.service.ts` to store old refresh token families
3. Update Web/Mobile `ensureSessionContinuity()` to attempt rollback if refresh fails
4. Add test case to session continuity tests
5. Update this doc with new flow

### Adding role-based route protection

1. Extend `ProtectedRouteGuard` in `packages/types/src/session.types.ts` with required roles
2. Update `evaluateProtectedRouteGuard()` in Web and Mobile to check roles
3. Add test cases to session continuity tests
4. Document the pattern in this guide

---

## Troubleshooting

### "Token is not valid" on introspect

- **Cause:** Access token expired (15m lifetime) and no valid refresh token to recover
- **Fix:** Call `POST /api/v1/auth/refresh` with stored refresh token, or redirect to login if refresh also fails

### "Refresh token is invalid or expired"

- **Cause:** Refresh token expired (7 days) OR was already used (single-use enforcement)
- **Fix:** Clear local storage and redirect to login; user must sign in again

### Session recovered but userId differs from stored session

- **Cause:** Ownership mismatch — likely bug in recovery logic or API returning wrong user
- **Fix:** Log the mismatch, clear storage, redirect to login, escalate as security incident

### Different roles on mobile vs. web

- **Cause:** Stale metadata in storage or race condition during token refresh
- **Fix:** Call `GET /api/v1/auth/introspect` to refresh metadata from API source of truth

---

## Related documentation

- [Session Lifecycle](./SESSION_LIFECYCLE.md) — Full bootstrap and refresh flow
- [Ownership and Recovery Implementation](./OWNERSHIP_AND_RECOVERY_IMPLEMENTATION.md) — Test coverage summary
- [Stellar Auth Safety](./apps/api/docs/STELLAR_AUTH_SAFETY.md) — Wallet boundary and abuse controls
- [API Authentication](./apps/api/docs/AUTHENTICATION.md) — Server-side implementation
- [Web Auth Setup](./apps/web/docs/WEB_AUTH_SETUP.md) — Next.js client setup
- [Mobile Auth Setup](./apps/mobile/docs/MOBILE_AUTH_SETUP.md) — Expo client setup
