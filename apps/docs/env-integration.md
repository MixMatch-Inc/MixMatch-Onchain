# Environment Variable Integration

This document maps each environment variable to the specific code that consumes it.

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
| `RPC_URL` | `packages/stellar/src/client.ts` | Soroban RPC endpoint |

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
