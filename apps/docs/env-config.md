# Environment Configuration Contract

## Overview

The API application loads environment variables via `apps/api/src/shared/config/env.ts`. All configuration is validated at startup.

## Required Variables

| Variable | Type | Description |
|---|---|---|
| `JWT_SECRET` | `string` | Secret for signing JWTs. Must be ≥32 chars in non-development environments. |
| `DATABASE_URL` | `string` | PostgreSQL connection string. Required when calling `validateEnv()`. |
| `RPC_URL` | `string` | Stellar RPC endpoint. Defaults to Soroban testnet. |

## Optional Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `NODE_ENV` | `string` | `"development"` | Application environment. |
| `PORT` | `number` | `3001` | HTTP listen port. Validated as 1–65535. |
| `JWT_EXPIRES_IN` | `string` | `"1h"` | JWT token lifetime. |
| `WEB_ORIGIN` | `string` | `"http://localhost:3000"` | Allowed CORS origin. |
| `STELLAR_NETWORK` | `"testnet" \| "public"` | `"testnet"` | Stellar network target. |

## Validation Rules

- All string values are **trimmed** before use.
- `PORT` must parse to an integer in range [1, 65535]. Non-numeric or out-of-range values throw at startup.
- `JWT_SECRET` length is enforced to ≥32 characters when `NODE_ENV !== "development"`.
- `validateEnv()` is an explicit startup check that ensures `DATABASE_URL`, `JWT_SECRET`, and `RPC_URL` are all present.

## TypeScript Contract

The exported `AppConfig` interface defines the shape:

```ts
export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  webOrigin: string;
  stellarNetwork: 'testnet' | 'public';
  rpcUrl: string;
}
```

## Extending the Config

To add a new environment variable:

1. Add the key to the `AppConfig` interface in `env.ts`.
2. Read and validate it in the module-level code or in `validateEnv()`.
3. Add the variable to this document.
4. Add tests in `apps/api/src/__tests__/env-config.test.ts`.
