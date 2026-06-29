# Testing Integration

This document describes how the testing strategy integrates with the
modular wiring system, auth shells, and CI pipeline.

## Modular Wiring Tests

`apps/api/src/common/modular-wiring/__tests__/module.registry.spec.ts`

| Test                          | What it guards                                      |
|-------------------------------|------------------------------------------------------|
| registers a valid submodule   | Core registration contract                           |
| rejects duplicate             | Prevents silent overwrites in production             |
| rejects null/undefined module | Catches broken wiring at bootstrap time              |
| rejects empty name            | Enforces naming convention                           |
| rejects missing initialize    | Ensures every module implements the required hook    |
| handles initialize throw      | Prevents half-wired modules from entering the map    |
| unregisters a module          | Clean teardown for hot-reload and testing            |
| warns on unknown unregister   | Debuggable log when a caller references a typo       |
| clears all modules            | Safe reset between test cases or environment flips   |
| hasModule check               | Query interface for dependent wiring                 |
| empty initial state           | Regression guard against accidental pre-population   |

These tests use Vitest and run as part of `pnpm --filter @mixmatch/api test`.

## Auth Shell Tests

### Mobile (`apps/mobile/src/__tests__/App.test.tsx`)

- Renders the sign-in form when no session is stored.
- Protected content (children) is hidden until authentication succeeds.
- Uses `localStorage` mocking to simulate authenticated/unauthenticated states.

## CI Pipeline

The regression coverage workflow runs on every push/PR to `main` or `dev`:

1. ✅ Install dependencies (`pnpm install --frozen-lockfile`)
2. ✅ Lint all packages (`turbo lint`)
3. ✅ Test all packages with coverage (`turbo test -- --coverage`)
4. ✅ Upload coverage artifacts (retained 7 days)

A PostgreSQL service container is available for future database-backed tests,
but all current tests use in-memory storage so they pass without external
dependencies.
