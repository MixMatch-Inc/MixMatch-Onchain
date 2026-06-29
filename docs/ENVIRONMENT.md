# Environment Setup

Each app has its own `.env.example`. Copy it to `.env` (or `.env.local`)
before running the app locally.

## apps/api/.env

| Variable          | Description                                            | Example                                                        |
| ----------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| `PORT`            | Port the API listens on                                 | `3001`                                                           |
| `NODE_ENV`        | Runtime environment                                     | `development`                                                    |
| `DATABASE_URL`    | PostgreSQL connection string (used by Prisma)           | `postgresql://postgres:postgres@localhost:5432/mixmatch?schema=public` |
| `JWT_SECRET`      | Secret used to sign access tokens                       | a long random string                                             |
| `JWT_EXPIRES_IN`  | Access token lifetime                                   | `1h`                                                              |
| `WEB_ORIGIN`      | Allowed CORS origin for the web app                     | `http://localhost:3000`                                          |

## apps/web/.env

| Variable              | Description                  | Example                  |
| --------------------- | ----------------------------- | -------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL of the API           | `http://localhost:3001`    |

## apps/mobile/.env

| Variable              | Description        | Example                |
| --------------------- | -------------------- | ------------------------ |
| `EXPO_PUBLIC_API_URL` | Base URL of the API | `http://localhost:3001`  |

## Local database

The API requires a PostgreSQL database. The simplest local option is Docker:

```bash
docker run --name mixmatch-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mixmatch \
  -p 5432:5432 -d postgres:16
```

Then, from `apps/api`:

```bash
pnpm prisma:migrate
```

## Edge Case & Failure Mode Handling

### Environment Validation Failures
The API enforces **fail-fast bootstrapping** to catch configuration issues immediately:
- The application will refuse to start if any required environment variables are missing
- `JWT_SECRET` must be at least 32 characters long; shorter secrets cause immediate startup failure
- `RPC_URL` (required for Stellar/Soroban integration) must be explicitly provided
- Malformed `PORT` values default to 3000, but invalid numeric formats throw type errors

### Empty State Bootstrapping
First-time setup handling for new environments:
- Database connection failures during boot are logged with clear error messages and exit codes
- Missing `.env` file throws an explicit error with instructions to copy from `.env.example`
- Empty database state is detected and handled gracefully by migration workflows

### Retry Logic & Operational Resilience
Environmental connection handling with built-in retry patterns:
- Database connection failures implement exponential backoff before failing permanently
- Stellar RPC client retries transient network errors 3 times with 1s delays between attempts
- CI/CD workflows include retry logic for flaky network dependencies to prevent false negatives

### Common Operational Failures & Remediation
| Failure Mode | Root Cause | Resolution Steps |
|--------------|------------|------------------|
| `JWT_SECRET too short` | Generated a weak secret locally/for production | Generate a secure secret with `openssl rand -hex 32` and update environment |
| Missing `RPC_URL` | Stellar network URL not configured | Add a valid Soroban RPC endpoint (e.g., from QuickNode or local node) |
| Database connection timeout | PostgreSQL not running or wrong connection string | Verify Docker container status and `DATABASE_URL` matches your local setup |
| CORS errors in web app | `WEB_ORIGIN` mismatch | Ensure `WEB_ORIGIN` in API env matches the exact origin of your Next.js app |

## CI environment

Workflows inject their own values at runtime — no `.env` files are committed.

| Workflow                  | Variables injected                                       |
| ------------------------- | -------------------------------------------------------- |
| `api.yml`                 | `JWT_SECRET`, `DATABASE_URL`, `RPC_URL` (job-level env) |
| `web.yml`                 | `NEXT_PUBLIC_API_URL` (build step env)                   |
| `regression-coverage.yml` | `JWT_SECRET`, `DATABASE_URL`, `NODE_ENV`, `RPC_URL` (test step env) |

The postgres service in `regression-coverage.yml` uses database name
`mixmatch_test` to avoid conflicts with other environments.

## Secrets handling

- Never commit `.env` files — they are gitignored.
- `JWT_SECRET` must be a long, random value (≥32 characters) in any non-local environment
- Generate secure secrets for production using `openssl rand -hex 32`
- CI uses a non-secret placeholder `JWT_SECRET` defined inline in the workflow files, only for running the test suite
- `RPC_URL` may contain API keys; store production values in your CI provider's secrets store
- For production deployments, store all sensitive secrets (JWT_SECRET, DATABASE_URL, RPC_URL) in your CI provider's secrets store (e.g., GitHub Actions Secrets) and reference them via `${{ secrets.SECRET_NAME }}`