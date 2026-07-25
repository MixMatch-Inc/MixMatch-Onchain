# Test Harness

## Scope

The test harness provides the shared infrastructure for writing reliable,
deterministic tests across the monorepo. It includes test app factories,
in-memory stores, mock utilities, and configuration that allow tests to run
without external dependencies (databases, networks, file systems).

## Why a shared harness matters

Without a consistent test harness, each package would reinvent its own test
setup — different mock strategies, different app factories, different assertion
patterns. This makes tests fragile, hard to maintain, and inconsistent across
packages. The harness ensures that all tests follow the same patterns and can
be run with a single command.

## Components

### Test App Factory

`apps/api/src/modules/auth/tests/test-app.ts` creates a fully wired Express
app using in-memory stores:

```typescript
import { createTestApp } from './test-app.js';

const app = createTestApp();
// Ready to use with supertest
```

The factory wires:
- `InMemoryUserRepository` (no database required)
- `InMemorySessionStore` (no database required)
- All auth routes (register, login, me, refresh, profile, admin)
- Error middleware for consistent error responses
- CORS and JSON body parsing

### In-Memory Stores

| Store | File | Purpose |
|-------|------|---------|
| `InMemoryUserRepository` | `users.repository.ts` | User CRUD without Prisma |
| `InMemorySessionStore` | `session.store.ts` | Session CRUD without Prisma |
| `InMemoryAuditStore` | `audit.service.ts` | Audit log storage for tests |

These stores implement the same interfaces as their production counterparts,
ensuring that tests exercise the same code paths.

### Mock Utilities

- `vi.fn()` / `jest.fn()` for function mocking
- `vi.spyOn()` for method interception
- `mockFetch` pattern for API client tests
- `localStorage` mock for client-side storage tests

## Architecture

```
Test File
    │
    ├── createTestApp() ──► Express app with in-memory stores
    │
    ├── supertest(app) ──► HTTP assertions
    │
    └── vitest / jest ──► Test runner + assertions
```

## Running Tests

| Command | Scope |
|---------|-------|
| `pnpm test` | All packages (via Turborepo) |
| `pnpm --filter @mixmatch/api test` | API only |
| `pnpm --filter @mixmatch/shared test` | Shared only |
| `pnpm --filter web test` | Web only |
| `pnpm --filter mobile test` | Mobile only |

## Coverage Thresholds

| Package | Minimum Coverage |
|---------|-----------------|
| `@mixmatch/api` | 80% |
| `@mixmatch/shared` | 80% |
| `@mixmatch/stellar` | 80% |

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Test modifies global state | Each test file runs in isolated environment |
| Async operations in tests | Use `await` or `act()` for React hooks |
| Mock not reset between tests | `beforeEach` cleanup is required |
| Database-dependent test | Use in-memory stores instead |
| Flaky network tests | Mock fetch instead of making real calls |

## Integration Points

| Component | Role |
|-----------|------|
| `vitest.config.ts` | Per-package test configuration |
| `jest.config.js` | Mobile test configuration |
| `tsconfig.json` | TypeScript paths for test imports |
| `turbo.json` | Orchestrates test execution across packages |
