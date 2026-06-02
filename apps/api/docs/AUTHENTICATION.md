# Authentication

## Overview

This starter implements the Authentication milestone with a contract-first API surface. Shared contracts live in `@themixmatch/types`; runtime behavior lives in `apps/api`.

For the full cross-workspace session lifecycle, see [Session Lifecycle](../../../docs/SESSION_LIFECYCLE.md).

## Shared contracts

Source: `packages/types/src/auth.ts`, `packages/types/src/session.types.ts`, `packages/types/src/auth-boundary.ts`

- `SignupRequest`, `LoginRequest`, `AuthSession`, `SessionBootstrap`
- `ValidateSessionRequest`, `ProtectedSession`
- `SessionRefreshRequest`, `SessionRefreshResponse`, `SessionContinuityOutcome`
- `IntrospectResponse`
- `SessionLogoutRequest`, `SessionLogoutResponse`
- `StellarServiceHandshake`
- `StellarAuthChallengeRequest/Response`, `StellarAuthVerifyRequest/Response`
- `ProtectedRouteGuard`, `RefreshTokenRecord`
- `evaluateProtectedRouteGuard()`, `continueSessionAfterRefresh()`, `isSupportedStellarSessionToken()`

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Create account |
| POST | `/api/v1/auth/login` | Public | Sign in |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token |
| GET | `/api/v1/auth/introspect` | Protected | Validate access token |
| POST | `/api/v1/auth/logout` | Public | Revoke refresh token |
| GET | `/api/v1/auth/handshake` | Public | Stellar handshake metadata |
| POST | `/api/v1/stellar/auth/challenge` | Public | Proxy challenge generation to `apps/stellar-service` |
| POST | `/api/v1/stellar/auth/verify` | Public | Proxy session-token + Stellar-key verification to `apps/stellar-service` |

## Key runtime files

| File | Purpose |
|------|---------|
| `src/app.ts` | Route mounting |
| `src/domains/identity/session.service.ts` | Refresh, introspect, logout logic |
| `src/domains/identity/session.handler.ts` | HTTP handlers |
| `src/middleware/require-auth.ts` | Bearer token guard |
| `src/services/jwt.service.ts` | Access (15m) + refresh (7d) JWT |
| `src/repositories/refresh-token.repository.ts` | In-memory refresh store |

## Expected response shapes

Success:

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresAt": "2026-06-01T12:15:00.000Z"
  }
}
```

Error:

```json
{
  "success": false,
  "code": "AUTH_UNAUTHORIZED",
  "message": "Unauthorized"
}
```

## Environment

| Variable | Default | Notes |
|----------|---------|-------|
| `JWT_SECRET` | dev secret | Required in production |
| `JWT_EXPIRES_IN` | `15m` | Access-token TTL consumed by `jwt.service.ts` |
| `STELLAR_SERVICE_URL` | http://localhost:3002 | Stellar proxy target |
| `PORT` | 3001 | API listen port |

## Contributor extension notes

- Keep auth/session ownership decisions in `src/domains/identity/session.service.ts`; avoid re-implementing refresh logic in route handlers.
- Keep protected-route vocabulary aligned to `ProtectedRouteGuard` and `evaluateProtectedRouteGuard()`.
- Keep wallet-link metadata under `SessionBootstrap.wallet`; do not introduce app-local copies of Stellar network config.
- Extend `src/middleware/require-auth.ts` / `requireRole()` for API-only authorization, not for app boot session continuity.
- When changing the auth-to-Stellar handoff, update both `apps/api/docs/AUTHENTICATION.md` and `apps/stellar-service/docs/STELLAR_AUTH_BOUNDARY.md` so contributors see one coherent boundary.

## Current tradeoffs

- Refresh-token storage is in-memory today.
- `POST /api/v1/stellar/auth/verify` currently enforces token shape and Stellar key shape, not on-chain signature proof.
- The starter deliberately avoids wallet custody and secret management in this milestone.

## Run tests

```bash
pnpm test
```

Covers refresh rotation, introspection, logout, `requireAuth` guard paths, and the shared auth-plus-Stellar boundary contract in `src/domains/identity/auth-stellar-boundary.contract.test.ts`.

## Open questions

- Refresh store is in-memory — swap for Redis/DB via repository interface
- Stellar verify is a format stub — on-chain signature validation is a follow-up
- Role-based route gating available via `requireRole()` — compose after `requireAuth`
