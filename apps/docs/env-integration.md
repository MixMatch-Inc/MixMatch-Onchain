# Environment Variable Integration

## Scope

This document maps each environment variable to the specific code that consumes
it, showing the exact dependency chain from variable definition to runtime
behaviour. It serves as the source of truth for adding, modifying, or
troubleshooting environment configuration.

## Why this mapping matters

Environment variables are the primary mechanism for configuring runtime
behaviour across environments (development, CI, production). Without a clear
mapping, developers cannot determine which variables affect which code paths,
making it difficult to add new variables safely or debug configuration issues.

## apps/api

| Variable | Consumed By | Purpose |
|----------|-----------|---------|
| `PORT` | `apps/api/src/app.ts` | Express listen port |
| `NODE_ENV` | `apps/api/src/common/config/env.config.ts` | Runtime behaviour (logging, error detail) |
| `DATABASE_URL` | `apps/api/prisma/schema.prisma` | Prisma connection string |
| `JWT_SECRET` | `apps/api/src/shared/middleware/auth.middleware.ts` | JWT signing and verification |
| `JWT_EXPIRES_IN` | `apps/api/src/modules/auth/session.service.ts` | Access token TTL |
| `WEB_ORIGIN` | `apps/api/src/app.ts` | CORS `origin` configuration |
| `STELLAR_NETWORK` | `packages/stellar/src/config.ts` | Stellar network selection |
| `RPC_URL` | `packages/stellar/src/config.ts` | Soroban RPC endpoint override, used by `client.ts`'s `rpc.Server` |
| `HORIZON_URL` | `packages/stellar/src/config.ts` | Horizon endpoint override, used by `client.ts`'s `Horizon.Server` |
| `WALLET_ENCRYPTION_KEY` | `apps/api/src/modules/payments/wallet-encryption.ts` | AES-256-GCM key encrypting stored Stellar secret keys |

## apps/web

| Variable | Consumed By | Purpose |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | `apps/web/src/lib/api-client.ts` | Base URL for API calls |

## apps/mobile

| Variable | Consumed By | Purpose |
|----------|-----------|---------|
| `EXPO_PUBLIC_API_URL` | `apps/mobile/src/services/api-client.ts` | Base URL for API calls |

## Dependency Graph

```
JWT_SECRET ──► auth.middleware.ts ──► requireAuth ──► me endpoint
                                      │
                                      ├── register endpoint
                                      ├── login endpoint
                                      ├── updateProfile endpoint
                                      └── refresh endpoint

JWT_EXPIRES_IN ──► session.service.ts ──► createSession() ──► AuthTokenResponse

DATABASE_URL ──► PrismaClient ──► UserRepository ──► AuthService
                                                      │
                                                      ├── register()
                                                      ├── login()
                                                      ├── getCurrentUser()
                                                      └── updateProfile()

WEB_ORIGIN ──► CORS middleware ──► all API responses

NEXT_PUBLIC_API_URL ──► api-client.ts
                          │
                          ├── registerUser()
                          ├── loginUser()
                          └── (future) refreshSession()
```

## Adding a New Variable

1. Add to the relevant `.env.example`
2. Document in this file and `docs/ENVIRONMENT.md`
3. Consume via `env.config.ts` (API) or `process.env` (web/mobile)
4. Inject into CI workflows in `.github/workflows/*.yml`

## Environment Validation

The API uses `apps/api/src/shared/config/env.ts` to validate environment
variables at startup. The `requireEnv()` helper ensures that required variables
are present before the server starts accepting requests.

### Validation Rules

| Variable | Validation |
|----------|------------|
| `JWT_SECRET` | Must be >32 characters in non-development environments |
| `PORT` | Defaults to `3001` if not set |
| `NODE_ENV` | Defaults to `development` if not set |
| `DATABASE_URL` | Required by Prisma; fails at connection time if missing |
| `WEB_ORIGIN` | Used by CORS; if missing, cross-origin requests are blocked |
| `WALLET_ENCRYPTION_KEY` | Must be a 64-character hex string (32 bytes) in non-development environments |

### Fail-Fast Behaviour

Missing required variables cause the server to crash on startup with a clear
error message rather than failing silently at runtime. This ensures that
configuration issues are caught immediately during deployment.
