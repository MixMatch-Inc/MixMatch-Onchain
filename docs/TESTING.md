# Testing Guide

## Running tests

From the repo root:

```bash
pnpm test
```

This runs each workspace package's `test` script via Turborepo. To run a
single package:

```bash
pnpm --filter @mixmatch/api test
pnpm --filter @mixmatch/web test
pnpm --filter @mixmatch/mobile test
pnpm --filter @mixmatch/shared test
pnpm --filter @mixmatch/stellar test
```

## Running with coverage

Vitest has built-in coverage support via `@vitest/coverage-v8`. Pass the
`--coverage` flag when running any Vitest-backed package:

```bash
pnpm --filter @mixmatch/api test -- --coverage
```

Coverage output is written to `coverage/` inside the package directory.

## Test structure

| Package              | Framework                          | Location                                  |
| -------------------- | ------------------------------------ | -------------------------------------------- |
| `apps/api`           | Vitest + Supertest                  | `src/modules/<module>/tests/*.test.ts`        |
| `apps/web`           | Vitest + React Testing Library      | `src/app/**/*.test.tsx`                       |
| `apps/mobile`        | Jest (`jest-expo`)                  | `src/__tests__/*.test.tsx`                    |
| `packages/shared`    | Vitest                              | `src/**/*.test.ts`                            |
| `packages/stellar`   | Vitest                              | `src/**/*.test.ts`                            |

### apps/api

The API tests run against an **in-memory user repository**
(`InMemoryUserRepository`), so they require no database connection and are
runnable immediately after `pnpm install`. Tests cover:

- Health check: `GET /health` returns `{ status: "ok" }` with HTTP 200
- Registration: success, duplicate email, invalid input
- Login: success, invalid password, non-existent account

### apps/web

Tests cover rendering and client-side validation for the login and signup
pages, using React Testing Library with a `jsdom` environment.

### apps/mobile

A single setup-verification test confirms the Jest/Expo testing
infrastructure renders the root component successfully. No screen or
feature tests exist yet, by design.

## CI expectations

Each GitHub Actions workflow (`.github/workflows/*.yml`) runs install, lint,
test, and (where applicable) build for its package on every pull request. A
failing test or build fails the corresponding check and blocks merge.

### Regression coverage workflow

`.github/workflows/regression-coverage.yml` runs the full test suite with
coverage on every push and pull request to `main` or `dev`. It:

1. Starts a PostgreSQL service container for integration tests that need a database.
2. Installs dependencies with `pnpm install --frozen-lockfile`.
3. Runs `turbo lint` across all packages.
4. Runs `turbo test -- --coverage` to collect coverage reports.
5. Uploads the `apps/api/coverage/` directory as an artifact retained for 7 days.

The API tests use an in-memory repository, so they run without the database.
The PostgreSQL service is available for future integration tests that require it.
