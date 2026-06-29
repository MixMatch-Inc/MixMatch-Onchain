# Auth Guard

The auth guard provides role-based access control (RBAC) and ownership verification for protected routes. It builds on top of the `requireAuth` middleware.

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
