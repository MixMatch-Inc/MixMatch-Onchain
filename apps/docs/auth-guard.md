# Auth Guard

## Scope

The auth guard provides role-based access control (RBAC) and ownership verification for protected routes. It builds on top of the `requireAuth` middleware to offer fine-grained access control beyond simple authentication.

## Why this layer exists

Authentication alone ("is this a valid user?") is insufficient for most real APIs. Admin routes need to check roles. Profile routes need to verify the caller owns the resource. Without a composable guard layer, each route handler would duplicate this logic, leading to inconsistencies and security gaps. The auth guard provides two reusable middleware factories that compose cleanly with `requireAuth`.

## Usage

```typescript
import { requireRole, allowOwnership } from '../modules/auth/auth.guard.js';
```

### Role-based access

Use `requireRole` to restrict a route to a specific role:

```typescript
router.get('/admin/users', requireAuth, requireRole('ADMIN'), handler);
```

When the user lacks the required role, the guard responds with `403 INSUFFICIENT_PERMISSIONS`. If `req.userId` is undefined (despite `requireAuth` having run), the guard throws `403 INSUFFICIENT_PERMISSIONS` as well.

Role values are defined in the `UserRole` enum (`USER`, `ADMIN`). The `requireAuth` middleware reads the role from the JWT payload and defaults to `'USER'` when none is present.

### Ownership checks

Use `allowOwnership` to ensure the authenticated user is the owner of the target resource:

```typescript
router.put('/profile/:id', requireAuth, allowOwnership, handler);
```

The ownership check compares `req.params.id` against `req.userId`. A mismatch yields `403 INSUFFICIENT_PERMISSIONS` with a descriptive message. Missing `params.id` results in a `400 VALIDATION_ERROR`.

### Route design

- **Public routes** — no guard, no `requireAuth`
- **Authenticated routes** — `requireAuth` only
- **Admin routes** — `requireAuth` + `requireRole('ADMIN')`
- **Owned-resource routes** — `requireAuth` + `allowOwnership`

Stack guards in order; each runs sequentially and short-circuits on failure.

## Architecture

```
Request ──► requireAuth ──► requireRole / allowOwnership ──► Route Handler
              │                        │
              │ JWT verified           │ Role/ownership checked
              │ userId attached        │ or 403 thrown
              │ or 401 thrown          │
```

## Integration Points

| Component | Role |
|-----------|------|
| `auth.middleware.ts` | `requireAuth` — JWT verification, attaches userId/role |
| `auth.guard.ts` | `requireRole`, `allowOwnership` — composed after requireAuth |
| `auth.routes.ts` | Wires guards onto specific routes |
| `@mixmatch/shared` | `UserRole` enum, `AuthGuardOptions`, `GuardResult` types |

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| `requireRole` without prior `requireAuth` | 403 INSUFFICIENT_PERMISSIONS (req.userId is undefined) |
| `allowOwnership` with missing `:id` param | 400 VALIDATION_ERROR |
| `allowOwnership` when user ID does not match param | 403 INSUFFICIENT_PERMISSIONS |
| Multiple guards on same route | Each runs sequentially; first failure short-circuits |
| Role value is default USER when JWT has no role claim | `requireRole(ADMIN)` correctly denies USER-role tokens |
