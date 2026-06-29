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

The auth module's tests run against an **in-memory user repository**
(`InMemoryUserRepository`), so they require no database connection and are
runnable immediately after `pnpm install`. Tests cover:

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

The `regression-coverage.yml` workflow runs the full test suite with
coverage enabled on every push to `main`/`dev` and on pull requests
targeting those branches. Coverage artifacts are uploaded and retained for
7 days.
