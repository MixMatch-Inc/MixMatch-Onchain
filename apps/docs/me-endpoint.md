# Me Endpoint

**Route:** `GET /api/auth/me`
**Auth:** Required (Bearer token)

## Contract

### Request

```
GET /api/auth/me
Authorization: Bearer <accessToken>
```

The access token is a JWT signed with the server's `JWT_SECRET`. It must contain
a `sub` claim set to the user's UUID and an optional `role` claim.

### Success Response

```
HTTP 200
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

The `passwordHash` field is **never** included in the response.

### Error Responses

| Status | Code                | Condition                                  |
|--------|---------------------|--------------------------------------------|
| 401    | `INVALID_TOKEN`     | Missing, malformed, or invalid token       |
| 401    | `TOKEN_EXPIRED`     | Token has expired                          |
| 404    | `NOT_FOUND`         | Token is valid but user no longer exists   |

Error shape:
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Missing or invalid Authorization header"
  }
}
```

## TypeScript Contract

```typescript
import type { AuthUser } from '@mixmatch/shared';

// Success response
interface MeResponse {
  user: AuthUser;
}

// Error response
interface AuthErrorResponse {
  error: {
    code: 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'NOT_FOUND';
    message: string;
  };
}
```

## Architecture

```
Client                          Express API
  │                                  │
  │  GET /api/auth/me                │
  │  Authorization: Bearer <jwt>     │
  │ ───────────────────────────────► │
  │                                  │
  │         requireAuth middleware   │
  │           • extract Bearer token │
  │           • verify JWT signature │
  │           • attach userId, role  │
  │           • or throw 401         │
  │                                  │
  │         AuthController.me        │
  │           • getCurrentUser(id)   │
  │           • 404 if not found     │
  │           • 200 { user }         │
  │                                  │
  │  200 { user }                    │
  │ ◄─────────────────────────────── │
```

## Integration Points

| Component       | Role                                          |
|-----------------|-----------------------------------------------|
| `auth.middleware.ts` | `requireAuth` — JWT verification          |
| `auth.service.ts`   | `getCurrentUser` — fetches user from DB    |
| `users.repository.ts` | `findById` — data access               |
| `api-client.ts` (web) | Not yet exposed; web calls API directly |
| `@mixmatch/shared` | `AuthUser`, `MeResponse` type contracts    |

## Edge Cases

| Scenario                         | Behaviour                                   |
|----------------------------------|---------------------------------------------|
| No Authorization header          | 401 INVALID_TOKEN                           |
| Malformed header (not Bearer)    | 401 INVALID_TOKEN                           |
| Invalid JWT (wrong secret)       | 401 INVALID_TOKEN                           |
| Expired JWT                      | 401 TOKEN_EXPIRED                           |
| Valid JWT but user was deleted   | 404 NOT_FOUND                               |
| Valid JWT, user exists           | 200 with user object, no passwordHash       |

## Testing

See `apps/api/src/modules/auth/tests/me.test.ts` — covers all error scenarios
and a successful flow.
