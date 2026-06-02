# Authentication

## Overview

This starter implements the Authentication milestone with a contract-first API surface. Shared contracts live in `@themixmatch/types`; runtime behavior lives in `apps/api`.

For the full cross-workspace session lifecycle, see [Session Lifecycle](../../../docs/SESSION_LIFECYCLE.md).

## Shared contracts

Source: `packages/types/src/auth.ts`, `packages/types/src/session.types.ts`

- `SignupRequest`, `LoginRequest`, `AuthSession`
- `SessionRefreshRequest`, `SessionRefreshResponse`
- `IntrospectResponse`
- `SessionLogoutRequest`, `SessionLogoutResponse`
- `StellarAuthChallengeRequest/Response`, `StellarAuthVerifyRequest/Response`
- `ProtectedRouteGuard`, `RefreshTokenRecord`

## API routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Create account |
| POST | `/api/v1/auth/login` | Public | Sign in |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token |
| GET | `/api/v1/auth/introspect` | Protected | Validate access token |
| POST | `/api/v1/auth/logout` | Public | Revoke refresh token |
| GET | `/api/v1/auth/handshake` | Public | Stellar handshake metadata |

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
| `STELLAR_SERVICE_URL` | http://localhost:3002 | Stellar proxy target |
| `PORT` | 3001 | API listen port |

## Run tests

```bash
pnpm test
```

Covers refresh rotation, introspection, logout, `requireAuth` guard paths, and the shared auth-plus-Stellar boundary contract in `src/domains/identity/auth-stellar-boundary.contract.test.ts`.

## Open questions

- Refresh store is in-memory — swap for Redis/DB via repository interface
- Stellar verify is a format stub — on-chain signature validation is a follow-up
- Role-based route gating available via `requireRole()` — compose after `requireAuth`
