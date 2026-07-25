# CI Pipelines

## Scope

This document describes the GitHub Actions workflows that run on every push
and pull request, how they relate to the test harness, and how to add new
checks without breaking the pipeline.

## Why this matters

CI is the safety net that prevents regressions from reaching production.
Without a clear mapping between test files and workflow steps, developers
cannot determine which tests run in which pipeline, or how to add new
checks. This document makes that mapping explicit.

## Workflow Overview

| Workflow                   | Trigger                        | What it runs                                  |
|---------------------------|--------------------------------|-----------------------------------------------|
| `api.yml`                 | PR/push to `apps/api/**`       | Lint, test, build for `@mixmatch/api`         |
| `web.yml`                 | PR/push to `apps/web/**`       | Lint, test, build for `@mixmatch/web`         |
| `shared.yml`              | PR/push to `packages/shared/**`| Lint, test, build for `@mixmatch/shared`      |
| `mobile.yml`              | PR/push to `apps/mobile/**`    | Lint, test, build for `@mixmatch/mobile`      |
| `regression-coverage.yml` | PR/push to `main` or `dev`     | Full regression suite across API              |

## Regression Coverage Pipeline

The regression coverage workflow (`regression-coverage.yml`) runs on every
push to `main` or `dev`. It ensures that:

1. Dependencies install cleanly (`pnpm install --frozen-lockfile`)
2. Lint passes (`turbo lint`)
3. All tests pass with coverage (`turbo test`)

This pipeline does not build the API — it only validates that tests and
linting pass. The `api.yml` workflow handles the full build step.

## Test Harness Integration

The test harness (`apps/api/src/shared/test-harness.ts`) provides reusable
helpers for API tests. All new API tests should import from the harness
rather than duplicating setup logic:

```ts
import { createTestContext, registerUser, loginUser, randomUser } from '../../shared/test-harness.js';
```

The regression coverage pipeline runs all test files under `apps/api/src/**`,
which includes the harness tests in `apps/api/src/shared/__tests__/`.

## Adding a New CI Check

1. Create or modify a workflow file in `.github/workflows/`.
2. Use `pnpm/action-setup@v4` and `actions/setup-node@v4` with `.nvmrc`.
3. Install with `pnpm install --frozen-lockfile`.
4. Reference the correct filter: `--filter=@mixmatch/<package>`.
5. Add `JWT_SECRET` env var for API tests (any non-empty string works in CI).
6. Ensure the check is triggered by the right path patterns.

## Environment Variables

| Variable       | Required | Value in CI                                |
|---------------|----------|--------------------------------------------|
| `JWT_SECRET`  | Yes      | `test-secret` or `ci-regression-secret`    |
| `NODE_ENV`    | No       | `test` (set automatically by Vitest)       |
| `DATABASE_URL`| No       | Not needed — tests use in-memory stores    |

## Troubleshooting

### CI fails with "Cannot find module '@mixmatch/shared'"

The shared package must be built first. Run:

```bash
pnpm --filter @mixmatch/shared build
```

### CI fails with "JWT_SECRET must be at least 32 characters"

Set the `JWT_SECRET` environment variable in your workflow:

```yaml
env:
  JWT_SECRET: test-secret
```

### CI fails with "frozen lockfile"

Run `pnpm install` locally and commit the updated `pnpm-lock.yaml`.
