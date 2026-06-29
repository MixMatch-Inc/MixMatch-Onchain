# Route Protection

## Overview

Route protection controls access to API endpoints based on authentication
status, user role, and resource ownership. The system uses middleware
functions that can be composed per-route.

## Access Levels

### Public
No authentication required. Example: `GET /health`.

### Authenticated
Requires a valid JWT in the `Authorization` header. The `requireAuth`
middleware decodes the token and attaches `req.userId` and `req.role`.
Example: `GET /api/auth/me`.

### Role-based
Requires the authenticated user to have a specific role. Built on top of
`requireAuth`. Example: `GET /api/auth/admin` requires `ADMIN` role.

### Ownership-based
Requires the authenticated user's ID to match the resource ID in the
route parameter. Example: `PUT /api/auth/profile/:id` requires
`req.userId === req.params.id`.

## Middleware

| Middleware       | Description                                    |
| ---------------- | ---------------------------------------------- |
| `requireAuth`    | Verifies JWT, sets `req.userId`/`req.role`     |
| `requireRole(r)` | Guards route to users with role `r`            |
| `allowOwnership` | Guards route to the resource owner             |

## Contract

Each protected route is documented with its access level:

```ts
import type { RouteProtectionContract } from '@mixmatch/shared';

const authRoutes: RouteProtectionContract[] = [
  { path: '/api/auth/register', method: 'POST', access: { kind: 'public' } },
  { path: '/api/auth/login', method: 'POST', access: { kind: 'public' } },
  { path: '/api/auth/me', method: 'GET', access: { kind: 'authenticated' } },
  { path: '/api/auth/admin', method: 'GET', access: { kind: 'role', role: 'ADMIN' } },
  { path: '/api/auth/profile/:id', method: 'PUT', access: { kind: 'ownership', paramId: 'id' } },
];
```

## Edge Cases

- **Expired tokens**: Return 401 with `TOKEN_EXPIRED` error code.
- **Missing tokens**: Return 401 with `INVALID_TOKEN` error code.
- **Insufficient role**: Return 403 with `INSUFFICIENT_PERMISSIONS`.
- **Ownership mismatch**: Return 403 with `INSUFFICIENT_PERMISSIONS`.
- **Missing resource ID**: Return 400 with `VALIDATION_ERROR`.
