# Testing Guide

## Testing philosophy

This project follows a **pragmatic testing strategy**:

- **Unit tests** verify isolated logic (helpers, utilities, domain rules).
- **Integration tests** verify module boundaries (controllers + repositories, components + hooks).
- **End-to-end tests** verify user-facing flows across the full stack (planned).

All API tests use an in-memory repository so they need no database connection.
Web and mobile tests mock network calls to stay isolated.

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

### Coverage thresholds

| Package            | Branches | Functions | Lines | Statements |
|--------------------|----------|-----------|-------|------------|
| `apps/api`         | 80%      | 80%       | 80%   | 80%        |
| `packages/shared`  | 80%      | 80%       | 80%   | 80%        |
| `packages/stellar` | 80%      | 80%       | 80%   | 80%        |

Web and mobile coverage thresholds are not yet enforced; they will be added
once feature coverage is established.

## Test structure

| Package              | Framework                          | Location                                  |
| -------------------- | ------------------------------------ | -------------------------------------------- |
| `apps/api`           | Vitest + Supertest                  | `src/modules/<module>/tests/*.test.ts`        |
| `apps/web`           | Vitest + React Testing Library      | `src/app/**/*.test.tsx`                       |
| `apps/mobile`        | Jest (`jest-expo`) / RTL            | `src/__tests__/*.test.tsx`                    |
| `packages/shared`    | Vitest                              | `src/**/*.test.ts`                            |
| `packages/stellar`   | Vitest                              | `src/**/*.test.ts`                            |

### apps/api

The API tests run against an **in-memory user repository**
(`InMemoryUserRepository`), so they require no database connection and are
runnable immediately after `pnpm install`. Tests cover:

- Health check: `GET /health` returns `{ status: "ok" }` with HTTP 200
- Registration: success, duplicate email, invalid input
- Login: success, invalid password, non-existent account

**Pattern: modular wiring tests**

Feature modules are tested in
`apps/api/src/common/modular-wiring/__tests__/module.registry.spec.ts`.
These tests verify:

- Successful registration and tracking of submodules
- Rejection of duplicate, null, or malformed modules
- Handling of `initialize` failures
- `unregister`, `clear`, and `hasModule` operations

### apps/web

Tests cover rendering and client-side validation for the login and signup
pages, using React Testing Library with a `jsdom` environment.

**Pattern: component tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('shows validation error for empty email', async () => {
  render(<LoginPage />);
  await userEvent.click(screen.getByRole('button', { name: /log in/i }));
  expect(screen.getByText(/email is required/i)).toBeVisible();
});
```

### apps/mobile

The mobile app uses Jest with `jest-expo` and React Testing Library.
Tests cover:

- App renders the auth shell when not logged in
- (Future) Auth form validation and submission flows

**Pattern: mobile tests**

```tsx
import { render, screen } from '@testing-library/react-native';

it('shows sign in screen when unauthenticated', () => {
  render(<App />);
  expect(screen.getByText('Sign In')).toBeTruthy();
});
```

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
5. Uploads coverage artifacts retained for 7 days.

The API tests use an in-memory repository, so they run without the database.
The PostgreSQL service is available for future integration tests that require it.

## Writing good tests

- **One concern per test case.** Avoid multiple assertions that test different behaviors.
- **Use descriptive names.** `it('rejects duplicate module registrations')` is better than `it('handles conflicts')`.
- **Keep tests fast.** Use in-memory repositories and mock external services.
- **Test failure modes, not just happy paths.** Edge cases catch regressions early.
- **Avoid test interdependence.** Each test should set up its own state via `beforeEach`.

## Integration with architecture

See [testing-integration.md](../apps/docs/testing-integration.md) for how the
testing strategy maps to the modular wiring, auth shell, and API modules.
