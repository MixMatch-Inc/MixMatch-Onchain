# Session Lifecycle — Authentication Milestone

This guide maps how protected sessions flow across the monorepo auth stack. It reflects the reset starter structure and the shared contracts in `@themixmatch/types`.

This page is the contributor-facing answer for issues `#392`, `#393`, `#394`, and `#395`: refresh, introspection, route gating, and session continuity are all described here as one flow instead of four disconnected tasks.

## Shared contracts

| Contract | Source | Purpose |
|----------|--------|---------|
| `AuthSession` | `packages/types/src/auth.ts` | Stored session payload shared by app workspaces |
| `SessionBootstrap` | `packages/types/src/auth.ts` | Ownership + wallet bootstrap metadata carried with auth responses |
| `SessionRefreshRequest` / `SessionRefreshResponse` | `packages/types/src/auth.ts` | Rotate access + refresh token pair |
| `IntrospectResponse` | `packages/types/src/auth.ts` | Validate an access token without side effects |
| `ProtectedSession` / `ValidateSessionRequest` | `packages/types/src/auth.ts` | Check whether a stored session is still usable |
| `SessionLogoutRequest` / `SessionLogoutResponse` | `packages/types/src/auth.ts` | Revoke refresh token on sign-out |
| `SessionContinuityOutcome` | `packages/types/src/auth.ts` | Client bootstrap result (`valid`, `refreshed`, `expired`) |
| `ProtectedRouteGuard` | `packages/types/src/session.types.ts` | Shared guard vocabulary for protected routes |
| `RefreshTokenRecord` | `packages/types/src/session.types.ts` | Server-side ownership + single-use refresh token record |
| `StellarServiceHandshake` | `packages/types/src/index.ts` | Wallet/network metadata exposed by `apps/stellar-service` |
| `StellarAuthChallengeRequest/Response` | `packages/types/src/auth.ts` | Wallet challenge at auth-to-Stellar handoff |
| `StellarAuthVerifyRequest/Response` | `packages/types/src/auth.ts` | Session verification at Stellar boundary |
| `evaluateProtectedRouteGuard()` | `packages/types/src/auth-boundary.ts` | Shared protected-route decision helper |
| `continueSessionAfterRefresh()` | `packages/types/src/auth-boundary.ts` | Shared continuity helper that preserves wallet/session metadata |
| `isSupportedStellarSessionToken()` | `packages/types/src/auth-boundary.ts` | Current starter rule for auth-to-Stellar session-token handoff |

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Create account, issue token pair |
| POST | `/api/v1/auth/login` | Public | Sign in, issue token pair |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token → new pair |
| GET | `/api/v1/auth/introspect` | Protected | Validate access token, return claims |
| POST | `/api/v1/auth/logout` | Public | Revoke refresh token (idempotent) |
| GET | `/api/v1/auth/handshake` | Public | Stellar service handshake metadata |
| POST | `/api/v1/stellar/auth/challenge` | Public | Proxy to stellar-service challenge |
| POST | `/api/v1/stellar/auth/verify` | Public | Proxy to stellar-service verify |

## Environment values

| Variable | App | Default | Notes |
|----------|-----|---------|-------|
| `JWT_SECRET` | API | `dev-secret-key-change-in-production` | Signs access + refresh JWTs |
| `JWT_EXPIRES_IN` | API | `15m` | Access-token TTL used by the auth slice |
| `PORT` | API | `3001` | API listen port |
| `STELLAR_SERVICE_URL` | API | `http://localhost:3002` | Stellar proxy + handshake target |
| `NEXT_PUBLIC_API_BASE_URL` | Web | `http://localhost:3001` | Auth client base URL |
| `EXPO_PUBLIC_API_BASE_URL` | Mobile | unset → local mock | Set to API root for remote auth |
| `STELLAR_SERVICE_PORT` | Stellar | `3002` | Stellar service listen port |
| `STELLAR_NETWORK_PASSPHRASE` | Stellar | Testnet | Returned by `/handshake` and challenge/verify flows |
| `STELLAR_HORIZON_URL` | Stellar | `https://horizon-testnet.stellar.org` | Wallet/network metadata exposed to clients |

## Session lifecycle

```text
register/login
  → API returns { token, refreshToken, user, session }
  → session.wallet is bootstrapped from the Stellar handshake/default wallet config
  → app stores AuthSession locally
  → on app boot: introspect(access token)
      → valid: keep stored AuthSession as-is
      → invalid + refreshToken: POST /refresh → apply continueSessionAfterRefresh()
      → else: clear storage → signed out
  → protected routes evaluate evaluateProtectedRouteGuard(session)
  → wallet-link flow calls /api/v1/stellar/auth/challenge or /verify using the session token
  → on sign-out: POST /logout(refreshToken) + clear local storage
```

### Current auth-to-Stellar seam

- `apps/api` owns user auth, JWTs, refresh rotation, and protected API routes.
- `apps/stellar-service` owns wallet-network metadata and the challenge/verify handoff.
- `packages/types` owns the contracts and small shared boundary helpers.
- The starter intentionally stops short of key custody or on-chain signature validation.
- `isSupportedStellarSessionToken()` currently accepts local dev tokens (`local.*`) and JWT-shaped tokens (`eyJ...`) only.

Access tokens expire after **15 minutes**. Refresh tokens expire after **7 days** and rotate on each refresh (single-use).

## Workspace entry points

| Workspace | Session continuity | Protected route guard | Auth client |
|-----------|-------------------|----------------------|-------------|
| API | `apps/api/src/domains/identity/session.service.ts` | `apps/api/src/middleware/require-auth.ts` | N/A (server) |
| Web | `apps/web/auth/session-continuity.ts` | `evaluateProtectedRouteGuard()` | `apps/web/auth/auth-client.ts` |
| Mobile | `apps/mobile/src/auth/sessionContinuity.ts` | `evaluateProtectedRouteGuard()` | `apps/mobile/src/auth/authClient.ts` |
| Stellar | `apps/stellar-service/src/index.ts` | Challenge/verify boundary | Proxied via API |

## Contributor checklist

When extending this slice, prefer this order:

1. Update or add the shared contract in `packages/types`
2. Wire runtime behavior in `apps/api` and/or `apps/stellar-service`
3. Reuse the shared helper names in docs and app code instead of inventing a new guard vocabulary
4. Keep wallet-linking metadata in `SessionBootstrap.wallet` rather than introducing workspace-local copies
5. Document any new env values or route expectations where contributors will discover them quickly

## Exercise the flow

```bash
# Terminal 1 — API
cd apps/api && pnpm dev

# Terminal 2 — Stellar service (optional, for wallet handoff)
cd apps/stellar-service && pnpm dev

# Terminal 3 — Web
cd apps/web && pnpm dev
```

1. Register or log in at `http://localhost:3000/login`
2. Visit `/dashboard` — protected route uses shared guard contract
3. Wait for access token expiry (15m) or manually invalidate token in storage
4. Reload — client should refresh via `/api/v1/auth/refresh` or redirect to login
5. Sign out — refresh token revoked server-side, local storage cleared

## Run verification coverage

```bash
pnpm --filter @themixmatch/api test
pnpm --filter @themixmatch/web test
pnpm --filter @themixmatch/mobile test
pnpm typecheck
```

## Open questions and next seams

These are intentional seams, not missing pieces contributors should guess around:

- **Refresh token storage**: In-memory Map today; swap for Redis/DB without changing the repository interface.
- **HttpOnly cookies**: Clients currently store tokens in localStorage / SecureStore. Production should move to cookie-based sessions.
- **Stellar verify stub**: stellar-service validates token format and key shape only — on-chain signature verification is a follow-up milestone.
- **Role-based UI gating**: `requireRole()` exists on API; web/mobile should compose role checks on top of `ProtectedRouteGuard`.
- **Device fingerprinting**: Not yet attached to refresh records — extension point in `session.service.ts`.
- **Issue scope**: the current PR only sharpens the auth documentation and web-facing contract notes. Runtime auth behavior stays in the existing starter boundary for now.

## Related docs

- [Monorepo auth setup](./MONOREPO_AUTH_SETUP.md)
- [API authentication](../apps/api/docs/AUTHENTICATION.md)
- [Web auth setup](../apps/web/docs/WEB_AUTH_SETUP.md)
- [Mobile auth setup](../apps/mobile/docs/MOBILE_AUTH_SETUP.md)
