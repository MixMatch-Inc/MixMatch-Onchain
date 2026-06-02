# Monorepo Auth Stack — Setup & Troubleshooting

## Overview

The MixMatch Onchain monorepo implements authentication across four workspaces with shared contracts in `@themixmatch/types`:

1. **API service** (`apps/api`) — session issuance, refresh, introspection, logout, route guards
2. **Web app** (`apps/web`) — Next.js client with session continuity and protected routes
3. **Mobile app** (`apps/mobile`) — Expo client with the same session seam
4. **Stellar service** (`apps/stellar-service`) — wallet challenge/verify boundary

Assigned web-auth issues `#392` through `#395` all reduce to the same contributor question: how does a stored session become valid, refreshed, expired, or route-safe without inventing one-off logic per workspace?

See [Session Lifecycle](./SESSION_LIFECYCLE.md) for the full contributor guide.

## Shared Contracts (`packages/types`)

| Type | File | Used By |
|------|------|---------|
| `LoginRequest` / `LoginResponseData` | `packages/types/src/auth.ts` | API, Web, Mobile |
| `SessionRefreshRequest` / `SessionRefreshResponse` | `packages/types/src/auth.ts` | API, Web, Mobile |
| `IntrospectResponse` | `packages/types/src/auth.ts` | API, Web, Mobile |
| `SessionLogoutRequest` / `SessionLogoutResponse` | `packages/types/src/auth.ts` | API, Web, Mobile |
| `SessionContinuityOutcome` | `packages/types/src/auth.ts` | Web, Mobile |
| `ProtectedRouteGuard` | `packages/types/src/session.types.ts` | Web, Mobile |
| `StellarAuthChallengeRequest/Response` | `packages/types/src/auth.ts` | API, Stellar |
| `StellarAuthVerifyRequest/Response` | `packages/types/src/auth.ts` | API, Stellar |
| `AuthSession` | `packages/types/src/auth.ts` | Web, Mobile |
| `ApiSuccess` / `ApiError` | `packages/types/src/auth-envelope.types.ts` | API, Web, Mobile |

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Sign in → token pair + session |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| GET | `/api/v1/auth/introspect` | Validate access token (protected) |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET | `/api/v1/auth/handshake` | Stellar handshake metadata |
| POST | `/api/v1/stellar/auth/challenge` | Stellar wallet challenge |
| POST | `/api/v1/stellar/auth/verify` | Stellar session verify |

## Web Auth Files

```
apps/web/auth/
├── auth-client.ts          # register, login, refresh, introspect, logout
├── auth-storage.ts         # localStorage persistence (sync API)
├── auth-context.tsx        # AuthProvider with session continuity bootstrap
├── session-continuity.ts   # shared seam: ensureSessionContinuity + guard
apps/web/app/
├── login/page.tsx          # Login form
├── dashboard/page.tsx      # Protected route (uses evaluateProtectedRouteGuard)
```

## Mobile Auth Files

```
apps/mobile/src/auth/
├── authClient.ts           # API client with refresh/introspect/logout
├── AuthProvider.tsx        # Session continuity on launch
├── authStorage.ts          # expo-secure-store persistence
├── sessionContinuity.ts    # shared seam (mirrors web)
```

## Stellar Auth Boundary

- `GET /handshake` on stellar-service — wallet/network metadata
- `POST /api/v1/stellar/auth/challenge` — challenge transaction XDR
- `POST /api/v1/stellar/auth/verify` — session + Stellar key verification (stub)

API proxies Stellar routes using `STELLAR_SERVICE_URL`.

## Running the Full Stack

```bash
cd apps/api && pnpm dev          # :3001
cd apps/web && pnpm dev          # :3000
cd apps/mobile && pnpm dev       # Expo
cd apps/stellar-service && pnpm dev  # :3002
```

## Environment Variables

| Variable | Required | Default | App |
|----------|----------|---------|-----|
| `JWT_SECRET` | No | dev secret | API |
| `STELLAR_SERVICE_URL` | No | http://localhost:3002 | API |
| `NEXT_PUBLIC_API_BASE_URL` | No | http://localhost:3001 | Web |
| `EXPO_PUBLIC_API_BASE_URL` | No | (local mock) | Mobile |
| `STELLAR_SERVICE_PORT` | No | 3002 | Stellar |

## Verification

```bash
pnpm --filter @themixmatch/api test
pnpm --filter @themixmatch/web test
pnpm --filter @themixmatch/mobile test
pnpm typecheck
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Session lost after 15m | Access token expired, refresh failed | Check refreshToken in stored session; verify `/auth/refresh` |
| Dashboard redirects to login | Guard denied access | Confirm session bootstrap completed (`isBootstrapping`) |
| Introspect returns 401 | Expired/missing Bearer token | Client should attempt refresh, then sign out |
| Stellar proxy 502 | Stellar service not running | Start `apps/stellar-service` or set `STELLAR_SERVICE_URL` |

## PR Checklist

- [ ] Shared types updated in `packages/types/src/`
- [ ] API routes wired in `apps/api/src/app.ts`
- [ ] Client auth methods updated in web/mobile
- [ ] Session continuity tests pass
- [ ] Docs updated in `docs/` and per-app `docs/`
- [ ] The web auth slice clearly explains refresh, introspection, and protected-route behavior for contributors
