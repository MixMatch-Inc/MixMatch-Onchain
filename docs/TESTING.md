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

## Test structure

| Package            | Framework                      | Location                              |
| ------------------ | ------------------------------ | ------------------------------------- |
| `apps/api`         | Vitest + Supertest             | `src/modules/<module>/tests/*.test.ts` |
| `apps/web`         | Vitest + React Testing Library | `src/app/**/*.test.tsx`               |
| `apps/mobile`      | Jest (`jest-expo`)             | `src/__tests__/*.test.tsx`            |
| `packages/shared`  | Vitest                         | `src/**/*.test.ts`                    |
| `packages/stellar` | Vitest                         | `src/**/*.test.ts`                    |

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

The `regression-coverage.yml` workflow runs the full test suite with
coverage enabled on every push to `main`/`dev` and on pull requests
targeting those branches. Coverage artifacts are uploaded and retained for
7 days.
