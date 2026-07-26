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
| `regression-coverage.yml` | PR/push to `main` or `dev`     | Full regression suite across API              |

## Pipeline Contracts

### `api.yml` — API Pipeline

**Triggers:**
- Pull requests modifying `apps/api/**`, `packages/**`, `pnpm-workspace.yaml`, or `.github/workflows/api.yml`
- Pushes to `dev` or `main` modifying `apps/api/**` or `packages/**`

**Jobs:**

| Step | Command | Expected Outcome |
|------|---------|-----------------|
| Install | `pnpm install --frozen-lockfile` | Clean install with locked versions |
| Lint | `pnpm exec turbo run lint --filter=@mixmatch/api` | No lint errors |
| Test | `pnpm exec turbo run test --filter=@mixmatch/api` | All tests pass |
| Build | `pnpm exec turbo run build --filter=@mixmatch/api` | TypeScript compilation succeeds |

**Environment Variables:**

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | `test-secret` |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/mixmatch?schema=public` |

### `regression-coverage.yml` — Regression Coverage Pipeline

**Triggers:**
- Pull requests to `main` or `dev`
- Pushes to `main` or `dev`

**Jobs:**

| Step | Command | Expected Outcome |
|------|---------|-----------------|
| Install | `pnpm install --frozen-lockfile` | Clean install with locked versions |
| Lint | `pnpm exec turbo run lint --filter=@mixmatch/api` | No lint errors |
| Test | `pnpm exec turbo run test --filter=@mixmatch/api` | All tests pass |

**Note:** This pipeline does not build the API — it only validates that tests
and linting pass. The `api.yml` workflow handles the full build step.

**Environment Variables:**

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | `ci-regression-secret` |

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

### Example workflow addition

```yaml
jobs:
  my-check:
    runs-on: ubuntu-latest
    env:
      JWT_SECRET: test-secret
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec turbo run my-check --filter=@mixmatch/api
```

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

### Tests fail with "Cannot find module"

Check the import path resolves correctly. Common causes:
- Wrong file extension (use `.js` for ESM imports)
- Missing dependency in `package.json`
- Incorrect relative path

### Lint fails with "Unexpected token"

Check for syntax errors in the modified file. Common causes:
- Missing comma in object literal
- Unclosed string or template literal
- Stray characters from copy-paste
