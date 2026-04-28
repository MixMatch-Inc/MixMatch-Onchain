# Workspace Import Boundary Rules

## Overview

This document defines the import boundary rules for the MixMatch monorepo. These rules prevent accidental architecture erosion by enforcing clear separation between workspaces.

## Rules

### 1. App Isolation

**Apps must NOT import from other apps directly.** Each app is an independent deployable unit.

```
✅ ALLOWED:
apps/api → packages/*
apps/web → packages/*
apps/mobile → packages/*
apps/stellar-service → packages/*

❌ DENIED:
apps/api → apps/web
apps/web → apps/mobile
apps/mobile → apps/api
apps/stellar-service → apps/web
```

### 2. Shared Contracts

**All inter-app communication must go through shared packages:**

- API contracts: `@mixmatch/types`, `@mixmatch/api-client`
- Blockchain contracts: `@mixmatch/contracts`
- UI components: `@mixmatch/ui`
- Analytics: `@mixmatch/analytics`

### 3. Internal Architecture (API)

**Controllers and routes must NOT directly import models or repositories:**

```
✅ ALLOWED:
routes → services → repositories → models
controllers → services → repositories → models

❌ DENIED:
controllers → models (bypasses service layer)
routes → repositories (bypasses service layer)
```

### 4. Workspace-Specific Allowed Imports

#### apps/api
**Allowed packages:**
- `@mixmatch/types`
- `@mixmatch/logger`
- `@mixmatch/observability`
- `@mixmatch/analytics`
- `@mixmatch/env-manifest`
- `@mixmatch/config`
- `@mixmatch/contracts`
- `@mixmatch/music-catalog`

#### apps/web
**Allowed packages:**
- `@mixmatch/types`
- `@mixmatch/analytics`
- `@mixmatch/env-manifest`
- `@mixmatch/config`
- `@mixmatch/ui`
- `@mixmatch/api-client`
- `@mixmatch/feature-flags`

#### apps/mobile
**Allowed packages:**
- `@mixmatch/types`
- `@mixmatch/mobile-test-harness`
- `@mixmatch/config`
- `@mixmatch/api-client`

#### apps/stellar-service
**Allowed packages:**
- `@mixmatch/types`
- `@mixmatch/logger`
- `@mixmatch/observability`
- `@mixmatch/env-manifest`
- `@mixmatch/config`
- `@mixmatch/contracts`

## ESLint Configuration

All apps use the `eslint-plugin-boundaries` from `@mixmatch/config`:

```javascript
// eslint.config.mjs
export default [
  {
    plugins: {
      boundaries: require('@mixmatch/config/eslint-plugin-boundaries'),
    },
    rules: {
      'boundaries/no-cross-app-imports': 'error',
    },
  },
];
```

## Enforcement

Boundary violations will **fail lint checks** in CI:

```bash
# Run lint locally
pnpm lint

# Run lint for specific workspace
pnpm --filter api lint
```

## Testing

An intentionally invalid import fixture is provided to verify the rules work:

```typescript
// apps/api/tests/fixtures/invalid-import.test.ts
// This file should FAIL lint when enabled
// @ts-expect-error - Testing boundary enforcement
import { something } from '../../web/app/page'; // Should error
```

## Exceptions

If you need to add a new allowed import:

1. Update `WORKSPACE_BOUNDARIES` in `packages/config/eslint-plugin-boundaries.js`
2. Update this documentation
3. Get approval from maintainers in PR

## Rationale

These rules exist to:

1. **Prevent tight coupling** between apps
2. **Enable independent deployment** of each app
3. **Enforce clean architecture** with proper layering
4. **Make dependencies explicit** through shared packages
5. **Support scaling** as more contributors join

## Migration

If you have existing violations:

1. Run `pnpm lint` to identify all violations
2. Refactor to use shared packages
3. Create shared package if needed
4. Update ESLint config to enable rules

## See Also

- [Dependency Injection Guide](../../apps/api/src/config/di.ts)
- [Architecture Decision Records](../../docs/adr/)
- [Service Boundaries ADR](../../docs/adr/0001-service-boundaries.md)
