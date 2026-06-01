# Authentication Architecture — Verification and Recovery Across Workspace Seams

## Overview

This document maps how **verification** (token validation) and **recovery** (token refresh + session restoration) work across the monorepo auth stack. It clarifies the contracts, invariants, and seams that enable hackathon teams to extend the system without reimplementing patterns in each runtime.

## Architecture layers

```
┌─────────────────────────────────────────────────────────┐
│ Web Client (Next.js)         Mobile Client (Expo)       │
│ ─────────────────────────────────────────────────────────│
│  ensureSessionContinuity()   ensureSessionContinuity()   │
│  evaluateProtectedRouteGuard evaluateProtectedRouteGuard │
│           localStorage              SecureStore          │
└───────────┬──────────────────────────────────┬───────────┘
            │ SharedContracts (introspect,     │
            │  refresh, logout)                │
            ▼                                   ▼
┌──────────────────────────────────────────────────────────┐
│ API Service (Node.js Express)                            │
│ ─────────────────────────────────────────────────────────│
│  POST /api/v1/auth/introspect  (verify token ownership) │
│  POST /api/v1/auth/refresh     (rotate tokens)           │
│  POST /api/v1/auth/logout      (revoke refresh token)    │
│                                                           │
│  session.service.ts (core logic)                         │
│  refresh-token.repository.ts (ownership store)           │
└──────────────────────────────────────────────────────────┘
            ▲
            │
┌───────────┴──────────────────────────────────────────────┐
│ Shared Type Contracts (@themixmatch/types)               │
│ ─────────────────────────────────────────────────────────│
│ AuthSession, IntrospectResponse, SessionRefreshResponse │
│ ProtectedRouteGuard, SessionContinuityOutcome            │
└──────────────────────────────────────────────────────────┘
```

## Verification seam — Token validation without side effects

### Contract: `IntrospectResponse`

**Source:** [packages/types/src/auth.ts](../packages/types/src/auth.ts)

```typescript
export interface IntrospectResponse {
  success: true;
  data: {
    valid: boolean;
    userId?: string;      // Only if valid
    role?: string;        // Only if valid
    iat?: number;         // Token issued-at (Unix timestamp)
    exp?: number;         // Token expiry (Unix timestamp)
  };
}
```

**Invariants:**

1. **Ownership visibility:** If `valid: true`, response includes `userId` and `role` for audit compliance.
2. **No enumeration:** If `valid: false`, response contains no user data, preventing attackers from discovering valid userIds.
3. **Read-only:** Introspection never issues new tokens — it only validates and returns claims.
4. **No side effects:** Introspection does not increment usage counters, rotate tokens, or modify server state.

### Implementation: API service

**Location:** [apps/api/src/domains/identity/session.service.ts](../apps/api/src/domains/identity/session.service.ts) — `introspectToken()`

```typescript
introspectToken(token: string): IntrospectResponse {
  try {
    // 1. Decode JWT (verify signature with JWT_SECRET)
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 2. Extract userId and role from claims
    const { sub: userId, role } = decoded;
    
    // 3. Return with ownership metadata
    return {
      success: true,
      data: {
        valid: true,
        userId,
        role,
        iat: decoded.iat,
        exp: decoded.exp,
      },
    };
  } catch (error) {
    // 4. Return "invalid" without exposing error details (no enumeration)
    return {
      success: true,
      data: { valid: false },
    };
  }
}
```

**Why no enumeration?** If introspect returned "token format is invalid" vs. "token signature is invalid" vs. "token expired," attackers could enumerate which tokens are valid format but wrong signature, leaking information about token structure.

### Usage: Web bootstrap

**Location:** [apps/web/auth/session-continuity.ts](../apps/web/auth/session-continuity.ts) — `ensureSessionContinuity()`

```typescript
async function ensureSessionContinuity(storedSession: AuthSession | null) {
  if (!storedSession) {
    return { status: 'expired', session: null };
  }

  // 1. Call API to verify stored access token
  const introspectResponse = await authClient.introspect(storedSession.accessToken);

  if (introspectResponse.data.valid) {
    // 2a. Access token is still valid → return immediately
    return {
      status: 'valid',
      session: storedSession,
    };
  }

  // 2b. Access token expired → attempt recovery via refresh
  if (!storedSession.refreshToken) {
    return { status: 'expired', session: null };
  }

  // 3. Proceed to recovery (see next seam)
  const refreshed = await attemptRefresh(storedSession);
  return refreshed;
}
```

**Ownership invariant:** `storedSession.userId` is compared with `introspectResponse.userId` (if both are present). If mismatch, session is rejected.

---

## Recovery seam — Token refresh with single-use enforcement

### Contract: `SessionRefreshResponse`

**Source:** [packages/types/src/auth.ts](../packages/types/src/auth.ts)

```typescript
export interface SessionRefreshResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      role: string;
      onboardingCompleted: boolean;
    };
    session: {
      userId: string;
      role: string;
      onboardingCompleted: boolean;
      issuedAt: string;
    };
  };
}
```

**Invariants:**

1. **Single-use refresh:** Old refresh token is invalidated before issuing new tokens. Replaying the old token returns a 401.
2. **Ownership preservation:** New `user.id` and `session.userId` match the old token's owner. Cross-user token swaps are rejected.
3. **Token rotation:** Both access and refresh tokens change. Access token expiry is reset (15m from now); refresh token expiry is reset (7d from now).
4. **Idempotent failure:** If refresh fails, the refresh token remains valid for retry (within its 7d window).

### Implementation: API service

**Location:** [apps/api/src/domains/identity/session.service.ts](../apps/api/src/domains/identity/session.service.ts) — `refreshSession()`

```typescript
async refreshSession(request: SessionRefreshRequest): Promise<SessionRefreshResponse> {
  // 1. Decode refresh token JWT
  let decoded: any;
  try {
    decoded = jwt.verify(request.refreshToken, JWT_SECRET);
  } catch (error) {
    throw new AuthError('INVALID_REFRESH_TOKEN', 'Token is invalid or expired');
  }

  const { jti, sub: userId } = decoded;

  // 2. Look up refresh token record in database
  // Invariant: jti → userId mapping is stored in database
  const record = this.refreshTokenRepository.findByJti(jti);
  if (!record || record.userId !== userId) {
    // 3. Cross-user token swap detected OR jti is stale
    throw new AuthError('INVALID_REFRESH_TOKEN', '...');
  }

  // 4. Get fresh user data from database
  const user = await userRepository.findById(userId);

  // 5. Revoke old refresh token (single-use enforcement)
  this.refreshTokenRepository.revoke(jti);

  // 6. Issue new access and refresh tokens
  const newAccessToken = this.jwtService.signAccessToken(userId, user.role);
  const newRefreshToken = this.jwtService.signRefreshToken(userId);
  const newJti = /* extract jti from newRefreshToken */;

  // 7. Store new refresh token record
  this.refreshTokenRepository.store({
    jti: newJti,
    userId,
    issuedAt: now(),
    expiresAt: now() + 7 * 24 * 60 * 60 * 1000,
  });

  // 8. Return new tokens with preserved ownership
  return {
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: userId, email: user.email, role: user.role, ... },
      session: { userId, role: user.role, ... },
    },
  };
}
```

**Key security boundary:** Step 2 verifies that the decoded `userId` matches the stored record's `userId`. If a token is replayed or the record is stale, the mismatch is caught.

### Usage: Web recovery

**Location:** [apps/web/auth/session-continuity.ts](../apps/web/auth/session-continuity.ts) — `ensureSessionContinuity()` (continued)

```typescript
async function attemptRefresh(storedSession: AuthSession) {
  try {
    // 1. Call API to rotate tokens
    const refreshResponse = await authClient.refresh({
      refreshToken: storedSession.refreshToken,
    });

    // 2. Verify ownership is preserved
    if (refreshResponse.data.user.id !== storedSession.userId) {
      // Ownership mismatch → reject recovery, clear storage
      clearStorage();
      return { status: 'expired', session: null };
    }

    // 3. Save new tokens and updated metadata
    const newSession = {
      accessToken: refreshResponse.data.accessToken,
      refreshToken: refreshResponse.data.refreshToken,
      user: refreshResponse.data.user,
    };
    saveSession(newSession);

    return {
      status: 'refreshed',
      session: newSession,
    };
  } catch (error) {
    // Refresh failed (token expired or revoked) → session is unrecoverable
    return { status: 'expired', session: null };
  }
}
```

**Ownership invariant:** Stored `userId` before refresh is compared with returned `user.id` after refresh. If mismatch, storage is cleared and user is logged out (as a security measure).

### Concurrent refresh protection

**Scenario:** Two browser tabs simultaneously call `POST /api/v1/auth/refresh` with the same refresh token.

**Resolution (single-use enforcement):**

1. **Tab A:** Sends refresh request with `jti: "abc123"`
2. **Tab B:** Sends refresh request with `jti: "abc123"` (same token)
3. **API (Tab A):** Looks up record, finds `{ jti: "abc123", userId: "user-1" }`, issues new tokens, **revokes jti "abc123"**
4. **API (Tab B):** Looks up record, finds nothing (already revoked), returns 401 "INVALID_REFRESH_TOKEN"
5. **Tab B:** Calls refresh again with **old** refresh token (from step 2) → still fails
6. **Tab B:** Calls refresh with **new** refresh token (from Tab A's browser storage) → succeeds

**Test case:** [apps/api/src/domains/identity/session-ownership.integration.test.ts](../apps/api/src/domains/identity/session-ownership.integration.test.ts) — "AUTH-065: prevents token confusion when two users refresh concurrently"

---

## Route guard seam — Ownership-aware protected routes

### Contract: `ProtectedRouteGuard`

**Source:** [packages/types/src/session.types.ts](../packages/types/src/session.types.ts)

```typescript
export interface ProtectedRouteGuard {
  authorized: boolean;
  userId?: string;
  role?: string;
  reason?: 'missing_session' | 'missing_role' | 'invalid_token';
}
```

**Invariants:**

1. **Consistent ownership:** `guard.userId` always matches `session.userId` (or both are undefined).
2. **No authorization bypass:** If `authorized: false`, no user data is exposed (prevents "guess the userId" attacks).
3. **Explicit reason:** Deny reasons are enumerated (`missing_session`, `missing_role`, etc.) to guide UI feedback without leaking implementation details.

### Implementation: Web

**Location:** [apps/web/auth/session-continuity.ts](../apps/web/auth/session-continuity.ts) — `evaluateProtectedRouteGuard()`

```typescript
export function evaluateProtectedRouteGuard(session: AuthSession | null): ProtectedRouteGuard {
  if (!session) {
    return {
      authorized: false,
      reason: 'missing_session',
    };
  }

  // Verify ownership is present
  if (!session.userId) {
    return {
      authorized: false,
      reason: 'invalid_token',
    };
  }

  return {
    authorized: true,
    userId: session.userId,
    role: session.role,
  };
}
```

**Usage in route:**

```typescript
// apps/web/app/dashboard/page.tsx
export default function DashboardPage() {
  const { session } = useAuth();
  const guard = evaluateProtectedRouteGuard(session);

  if (!guard.authorized) {
    return <Redirect to="/login" reason={guard.reason} />;
  }

  return <Dashboard userId={guard.userId!} role={guard.role!} />;
}
```

### Implementation: Mobile

**Same contract and logic as Web.** Location: [apps/mobile/src/auth/sessionContinuity.ts](../apps/mobile/src/auth/sessionContinuity.ts)

---

## Logout seam — Ownership-aware token revocation

### Contract: `SessionLogoutResponse`

**Source:** [packages/types/src/auth.ts](../packages/types/src/auth.ts)

```typescript
export interface SessionLogoutResponse {
  success: true;
  data: Record<string, never>; // Empty payload
}
```

**Invariants:**

1. **Idempotent:** Calling logout twice (or with expired token) succeeds both times.
2. **Ownership-enforced:** The refresh token being revoked is linked to a specific `userId`. Only that user's token is affected.
3. **No side effects:** Logout does not affect other users or sessions.

### Implementation: API service

**Location:** [apps/api/src/domains/identity/session.service.ts](../apps/api/src/domains/identity/session.service.ts) — `logout()`

```typescript
logout(request: SessionLogoutRequest): SessionLogoutResponse {
  // 1. Decode refresh token JWT
  let decoded: any;
  try {
    decoded = jwt.verify(request.refreshToken, JWT_SECRET);
  } catch (error) {
    // 2. Token is invalid/expired → logout is idempotent, return success
    return { success: true, data: {} };
  }

  const { jti, sub: userId } = decoded;

  // 3. Look up refresh token record
  const record = this.refreshTokenRepository.findByJti(jti);
  if (!record) {
    // Already revoked or never existed → return success (idempotent)
    return { success: true, data: {} };
  }

  // 4. Verify ownership (security boundary)
  if (record.userId !== userId) {
    // Token ownership mismatch → reject (no enumeration)
    return { success: true, data: {} }; // Lie to attacker
  }

  // 5. Revoke the token
  this.refreshTokenRepository.revoke(jti);

  return { success: true, data: {} };
}
```

### Usage: Web logout

**Location:** [apps/web/auth/auth-context.tsx](../apps/web/auth/auth-context.tsx) — `logout()`

```typescript
async function logout() {
  const session = getStoredSession();
  if (session) {
    try {
      // 1. Revoke refresh token on API
      await authClient.logout({
        refreshToken: session.refreshToken,
      });
    } catch (error) {
      // Logout failed, but continue to clear local storage anyway
      console.warn('Logout failed:', error);
    }
  }

  // 2. Clear local storage
  clearStorage();

  // 3. Redirect to login
  navigate('/login');
}
```

---

## Shared contracts — Single source of truth

All verification and recovery flows depend on these shared types:

| Contract | File | Used by |
|----------|------|---------|
| `AuthSession` | `auth.ts` | Web, Mobile (stored session metadata) |
| `IntrospectResponse` | `auth.ts` | API, Web, Mobile (verify tokens) |
| `SessionRefreshRequest` / `SessionRefreshResponse` | `auth.ts` | API, Web, Mobile (rotate tokens) |
| `SessionLogoutRequest` / `SessionLogoutResponse` | `auth.ts` | API, Web, Mobile (revoke tokens) |
| `SessionContinuityOutcome` | `auth.ts` | Web, Mobile (bootstrap result) |
| `ProtectedRouteGuard` | `session.types.ts` | Web, Mobile (route authorization) |

**Update path:** When changing a contract (e.g., adding a new field to `IntrospectResponse`):

1. Update the type in `packages/types/src/auth.ts`
2. Run `pnpm typecheck` to ensure all consumers are updated
3. Update API implementation to include the new field
4. Update Web and Mobile to handle the new field
5. Update test cases to verify the new field is propagated correctly

---

## Testing verification and recovery — Seam-level regression prevention

### Unit tests (single layer)

**API:**
- `session.service.test.ts` — Ownership isolation, single-use refresh, introspection
- `session-ownership.integration.test.ts` — Concurrent user protection, cross-user token rejection

**Web:**
- `session-continuity.test.ts` — Token verification on boot, refresh recovery, guard enforcement

**Mobile:**
- `sessionContinuity.test.ts` — Session restoration, multi-user isolation, guard enforcement

### Integration tests (cross-layer)

**Manual testing:**
1. Sign up on Web → verify session is created
2. Reload Web → verify session is restored via introspect
3. Wait 15m (or mock expiry) → reload → verify session is recovered via refresh
4. Sign out → verify refresh token is revoked, storage is cleared
5. Sign in on Mobile → verify session is persisted in SecureStore
6. Relaunch Mobile → verify session is restored via introspect/refresh

**Automated testing:**
```bash
pnpm --filter @themixmatch/api test -- session
pnpm --filter @themixmatch/web test -- session-continuity
pnpm --filter @themixmatch/mobile test -- sessionContinuity
pnpm typecheck  # Ensure shared contracts are in sync
```

---

## Extension patterns

### Adding device fingerprinting to refresh

1. Add `deviceFingerprint` to `RefreshTokenRecord` in API database schema
2. Update `session.service.ts` to compute and store device fingerprint on refresh
3. Update introspect to validate device fingerprint matches current request
4. Add test case to `session-ownership.integration.test.ts`
5. Document the pattern in [VERIFICATION_AND_RECOVERY_SETUP.md](./VERIFICATION_AND_RECOVERY_SETUP.md)

### Adding role-based route protection

1. Extend `ProtectedRouteGuard` in `packages/types/src/session.types.ts` with `requiredRoles`
2. Update `evaluateProtectedRouteGuard()` in Web and Mobile to check roles
3. Add test cases to session continuity tests
4. Document the pattern in this guide

### Adding Stellar signature verification to session

1. Add `stellarPublicKey` and `stellarSignature` to `AuthSession` in `packages/types`
2. Update `POST /api/v1/auth/introspect` to validate Stellar signature matches stored key
3. Update Web and Mobile recovery flows to include Stellar key in verification
4. Add test cases to session continuity tests
5. Document the pattern in this guide

---

## Related documentation

- [Verification and Recovery Setup](./VERIFICATION_AND_RECOVERY_SETUP.md) — Detailed guide for teams extending verification and recovery
- [Local Auth Setup](../apps/api/docs/LOCAL_AUTH_SETUP.md) — Exercise flows and troubleshooting
- [Session Lifecycle](./SESSION_LIFECYCLE.md) — Full bootstrap and lifecycle
- [Ownership and Recovery Implementation](./OWNERSHIP_AND_RECOVERY_IMPLEMENTATION.md) — Test coverage summary
- [Stellar Auth Safety](../apps/api/docs/STELLAR_AUTH_SAFETY.md) — Wallet boundary and abuse controls
