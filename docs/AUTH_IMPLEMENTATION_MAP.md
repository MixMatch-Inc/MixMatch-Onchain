# Authentication Implementation Map — Quick Reference for Contributors

## Problem: Where is verification and recovery implemented?

This guide maps the monorepo auth stack so contributors can quickly find the code that implements verification, recovery, and ownership enforcement.

## Layer-by-layer implementation map

### API Service (`apps/api`)

**Core logic:**

| File | Implements |
|------|-----------|
| `src/domains/identity/session.service.ts` | Token introspection, refresh, logout; core ownership invariants |
| `src/domains/identity/session.handler.ts` | HTTP route handlers for `/auth/*` endpoints |
| `src/services/jwt.service.ts` | JWT signing and verification (access + refresh tokens) |
| `src/repositories/refresh-token.repository.ts` | Refresh token storage (jti → userId mapping); single-use enforcement |
| `src/middleware/require-auth.ts` | Bearer token guard for protected endpoints |

**Testing:**

| File | Tests |
|------|-------|
| `src/domains/identity/session.service.test.ts` | Ownership isolation, recovery semantics, idempotence |
| `src/domains/identity/session-ownership.integration.test.ts` | Concurrent user protection, cross-user token rejection |

**Documentation:**

| File | Content |
|------|---------|
| `docs/AUTHENTICATION.md` | API contracts and routes |
| `docs/LOCAL_AUTH_SETUP.md` | Setup, environment variables, exercise flows, troubleshooting |

**Contracts (`packages/types`):**

| Type | Used For |
|------|----------|
| `IntrospectResponse` | Return ownership metadata from introspection |
| `SessionRefreshRequest` / `SessionRefreshResponse` | Token rotation request/response |
| `SessionLogoutRequest` / `SessionLogoutResponse` | Token revocation request/response |
| `AuthSession` | Session metadata stored in database and returned to clients |

---

### Web Client (`apps/web`)

**Verification and recovery:**

| File | Implements |
|------|-----------|
| `auth/session-continuity.ts` | `ensureSessionContinuity()` — bootstrap verification and recovery |
| `auth/session-continuity.ts` | `evaluateProtectedRouteGuard()` — ownership-aware route protection |
| `auth/auth-client.ts` | HTTP client: `introspect()`, `refresh()`, `logout()` |
| `auth/auth-storage.ts` | localStorage persistence: `loadSession()`, `saveSession()`, `clearSession()` |
| `auth/auth-context.tsx` | `AuthProvider` — session continuity on app mount |

**Testing:**

| File | Tests |
|------|-------|
| `auth/session-continuity.test.ts` | Verification on boot, recovery flow, guard enforcement, ownership preservation |

**Documentation:**

| File | Content |
|------|---------|
| `docs/WEB_AUTH_SETUP.md` | Web-specific setup and contracts |

**Protected route example:**

| File | Pattern |
|------|---------|
| `app/dashboard/page.tsx` | Uses `evaluateProtectedRouteGuard()` to protect route |

---

### Mobile Client (`apps/mobile`)

**Verification and recovery:**

| File | Implements |
|------|-----------|
| `src/auth/sessionContinuity.ts` | `ensureSessionContinuity()` — bootstrap verification and recovery (same pattern as Web) |
| `src/auth/sessionContinuity.ts` | `evaluateProtectedRouteGuard()` — ownership-aware route protection |
| `src/auth/authClient.ts` | HTTP client: `introspect()`, `refresh()`, `logout()` |
| `src/auth/authStorage.ts` | expo-secure-store persistence: `loadSession()`, `saveSession()`, `clearSession()` |
| `src/auth/AuthProvider.tsx` | Session continuity on app launch |

**Testing:**

| File | Tests |
|------|-------|
| `src/auth/__tests__/sessionContinuity.test.ts` | Session restoration, recovery flow, ownership isolation |

**Documentation:**

| File | Content |
|------|---------|
| `docs/MOBILE_AUTH_SETUP.md` | Mobile-specific setup and contracts |

---

### Shared Types (`packages/types`)

**All contracts:**

| File | Types |
|------|-------|
| `src/auth.ts` | `AuthSession`, `IntrospectResponse`, `SessionRefreshRequest/Response`, `SessionLogoutRequest/Response`, `SessionContinuityOutcome`, etc. |
| `src/session.types.ts` | `ProtectedRouteGuard`, `SessionGuardResult` |
| `src/auth-errors.types.ts` | Error code enums: `INVALID_REFRESH_TOKEN`, `INVALID_TOKEN`, etc. |
| `src/auth-envelope.types.ts` | `ApiSuccess<T>`, `ApiError` — response envelope |

**No implementation here — types only.** Update types when extending verification/recovery patterns, then run `pnpm typecheck` to ensure all consumers are updated.

---

### Monorepo Documentation

**High-level guides:**

| File | Content |
|------|---------|
| `docs/MONOREPO_AUTH_SETUP.md` | Overview of all services, contracts, and routes |
| `docs/SESSION_LIFECYCLE.md` | Full session lifecycle (register → login → refresh → logout) |
| `docs/VERIFICATION_AND_RECOVERY_SETUP.md` | **Deep dive** into verification and recovery flows, testing patterns, extension points |
| `docs/AUTH_ARCHITECTURE_VERIFICATION_AND_RECOVERY.md` | Architecture map of verification/recovery seams, contracts, invariants |
| `docs/OWNERSHIP_AND_RECOVERY_IMPLEMENTATION.md` | Test coverage summary (what's covered, what's not) |

---

## Common contributor scenarios

### "I want to understand how token verification works"

1. Start: [docs/VERIFICATION_AND_RECOVERY_SETUP.md](../docs/VERIFICATION_AND_RECOVERY_SETUP.md) — "Verification flow" section
2. Code: [apps/api/src/domains/identity/session.service.ts](../apps/api/src/domains/identity/session.service.ts) — `introspectToken()` method
3. Test: [apps/api/src/domains/identity/session.service.test.ts](../apps/api/src/domains/identity/session.service.test.ts) — "Introspection" tests
4. Contract: [packages/types/src/auth.ts](../packages/types/src/auth.ts) — `IntrospectResponse` type

### "I want to understand how token refresh works"

1. Start: [docs/VERIFICATION_AND_RECOVERY_SETUP.md](../docs/VERIFICATION_AND_RECOVERY_SETUP.md) — "Recovery flow — Refreshing and restoring ownership" section
2. Code: [apps/api/src/domains/identity/session.service.ts](../apps/api/src/domains/identity/session.service.ts) — `refreshSession()` method
3. Test: [apps/api/src/domains/identity/session-ownership.integration.test.ts](../apps/api/src/domains/identity/session-ownership.integration.test.ts) — "Refresh flow" tests
4. Contract: [packages/types/src/auth.ts](../packages/types/src/auth.ts) — `SessionRefreshRequest/Response` types

### "I want to understand how Web/Mobile restore sessions on app boot"

1. Start: [docs/VERIFICATION_AND_RECOVERY_SETUP.md](../docs/VERIFICATION_AND_RECOVERY_SETUP.md) — "Session restoration on mobile/web app boot" section
2. Code (Web): [apps/web/auth/session-continuity.ts](../apps/web/auth/session-continuity.ts) — `ensureSessionContinuity()` function
3. Code (Mobile): [apps/mobile/src/auth/sessionContinuity.ts](../apps/mobile/src/auth/sessionContinuity.ts) — `ensureSessionContinuity()` function
4. Test (Web): [apps/web/auth/session-continuity.test.ts](../apps/web/auth/session-continuity.test.ts)
5. Test (Mobile): [apps/mobile/src/auth/__tests__/sessionContinuity.test.ts](../apps/mobile/src/auth/__tests__/sessionContinuity.test.ts)

### "I want to understand ownership isolation and how to test it"

1. Start: [docs/VERIFICATION_AND_RECOVERY_SETUP.md](../docs/VERIFICATION_AND_RECOVERY_SETUP.md) — "Ownership isolation during refresh" section
2. Architecture: [docs/AUTH_ARCHITECTURE_VERIFICATION_AND_RECOVERY.md](../docs/AUTH_ARCHITECTURE_VERIFICATION_AND_RECOVERY.md) — "Concurrent refresh protection" section
3. Test: [apps/api/src/domains/identity/session-ownership.integration.test.ts](../apps/api/src/domains/identity/session-ownership.integration.test.ts) — "AUTH-065: prevents token confusion when two users refresh concurrently"

### "I want to add a new verification step (e.g., device fingerprinting)"

1. Guide: [docs/VERIFICATION_AND_RECOVERY_SETUP.md](../docs/VERIFICATION_AND_RECOVERY_SETUP.md) — "Extending verification" section
2. API implementation: Update `session.service.ts` to compute and validate device fingerprint
3. Contracts: Update `RefreshTokenRecord` type in `packages/types` (or add new type)
4. Testing: Add test case to `session-ownership.integration.test.ts`
5. Documentation: Update [docs/VERIFICATION_AND_RECOVERY_SETUP.md](../docs/VERIFICATION_AND_RECOVERY_SETUP.md) with new invariant

### "I want to add role-based route protection"

1. Guide: [docs/AUTH_ARCHITECTURE_VERIFICATION_AND_RECOVERY.md](../docs/AUTH_ARCHITECTURE_VERIFICATION_AND_RECOVERY.md) — "Adding role-based route protection to session" extension pattern
2. Contracts: Update `ProtectedRouteGuard` type in `packages/types/src/session.types.ts`
3. Implementation (Web): Update `evaluateProtectedRouteGuard()` in `apps/web/auth/session-continuity.ts`
4. Implementation (Mobile): Update `evaluateProtectedRouteGuard()` in `apps/mobile/src/auth/sessionContinuity.ts`
5. Testing: Add test cases to `apps/web/auth/session-continuity.test.ts` and `apps/mobile/src/auth/__tests__/sessionContinuity.test.ts`

### "I want to understand and test the logout flow"

1. Start: [docs/VERIFICATION_AND_RECOVERY_SETUP.md](../docs/VERIFICATION_AND_RECOVERY_SETUP.md) — "Logout seam" section
2. Code (API): [apps/api/src/domains/identity/session.service.ts](../apps/api/src/domains/identity/session.service.ts) — `logout()` method
3. Code (Web): [apps/web/auth/auth-context.tsx](../apps/web/auth/auth-context.tsx) — `logout()` function
4. Test: [apps/api/src/domains/identity/session.service.test.ts](../apps/api/src/domains/identity/session.service.test.ts) — "Logout" tests

---

## Testing checklist for regressions

Before submitting a PR, verify:

- [ ] `pnpm typecheck` passes (shared contracts are in sync)
- [ ] `pnpm --filter @themixmatch/api test -- session` passes (API ownership isolation and recovery)
- [ ] `pnpm --filter @themixmatch/web test -- session-continuity` passes (Web verification and recovery)
- [ ] `pnpm --filter @themixmatch/mobile test -- sessionContinuity` passes (Mobile verification and recovery)
- [ ] Full stack boots without auth errors: `pnpm dev` in all apps
- [ ] Protected routes redirect to login when not authenticated
- [ ] Token refresh works: mock access token expiry, reload, verify session is restored
- [ ] Session ownership is preserved: verify userId, role, and metadata remain consistent through refresh

---

## File size and complexity reference

| File | Lines | Complexity | When to update |
|------|-------|-----------|----------------|
| `apps/api/src/domains/identity/session.service.ts` | ~300 | High | Adding verification step, changing refresh semantics |
| `apps/web/auth/session-continuity.ts` | ~150 | Medium | Adding recovery step, changing continuity outcome |
| `apps/mobile/src/auth/sessionContinuity.ts` | ~150 | Medium | Adding recovery step (mirrors Web) |
| `packages/types/src/auth.ts` | ~200 | Low | Adding new field to existing contract or new contract |
| Test files | ~400–600 each | High | Adding regression coverage |

---

## Design principles

These principles guide verification and recovery across the stack:

1. **Shared contracts as single source of truth:** Web, Mobile, and API all import from `packages/types`. No type duplication.
2. **Ownership invariants enforced at seams:** API enforces jti → userId mapping; Web/Mobile verify stored userId matches API response.
3. **Read-only verification:** Introspection never modifies state or issues new tokens; it only validates.
4. **Single-use refresh tokens:** Old token is revoked before issuing new pair; prevents replay attacks.
5. **Idempotent failures:** Logout succeeds even if token is already revoked; refresh fails gracefully if token is expired.
6. **No enumeration on validation failure:** Invalid token responses never reveal why (format, signature, expiry); prevents information leakage.
7. **Explicit ownership preservation:** All recovery flows compare stored userId with API response; mismatch is treated as security incident.

---

## Related quick links

- 🔐 [Verification and Recovery Setup](../docs/VERIFICATION_AND_RECOVERY_SETUP.md) — **Start here for team guidance**
- 🏗️ [Auth Architecture Map](../docs/AUTH_ARCHITECTURE_VERIFICATION_AND_RECOVERY.md) — Deep dive into seams and contracts
- 🚀 [Local Auth Setup](../apps/api/docs/LOCAL_AUTH_SETUP.md) — Run and exercise the flows
- 📋 [Session Lifecycle](../docs/SESSION_LIFECYCLE.md) — Full register → login → refresh → logout flow
- ✅ [Ownership and Recovery Implementation](../docs/OWNERSHIP_AND_RECOVERY_IMPLEMENTATION.md) — Test coverage summary
