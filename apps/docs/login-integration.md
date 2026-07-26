# Login Flow Integration

## Contract

**Route:** `POST /api/auth/login`
**Auth:** None (public)

### Request

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

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
  },
  "accessToken": "jwt-string"
}
```

### Error Responses

| Status | Code                | Condition                                    |
|--------|---------------------|----------------------------------------------|
| 400    | `VALIDATION_ERROR`  | Missing or invalid email/password            |
| 401    | `UNAUTHORIZED`      | Invalid email or password (same message)     |
| 429    | `RATE_LIMITED`      | >5 failed attempts in 15 min window          |

The 401 error returns the same message for both wrong email and wrong password
to prevent user enumeration.

Error shape:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

## Data Flow

```
Web Browser                      Express API                   PostgreSQL
     │                               │                           │
     │  POST /api/auth/login         │                           │
     │  { email, password }          │                           │
     │ ──────────────────────────►   │                           │
     │                               │  loginSchema.safeParse    │
     │                               │  ▼ valid                  │
     │                               │  AuthService.login()      │
     │                               │    ├─ check rate limit    │
     │                               │    ├─ find user by email► │
     │                               │    ├─ compare password    │
     │                               │    ├─ create session      │
     │                               │    └─ build token pair    │
     │                               │                           │
     │  200 { user, accessToken }    │                           │
     │ ◄──────────────────────────   │                           │
```

## TypeScript Contract

```typescript
import type { LoginSchema } from '@mixmatch/shared';

// Request validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// Response
interface AuthTokenResponse {
  user: AuthUser;
  accessToken: string;
}
```

## Integration Points

| Component | Role |
|-----------|------|
| `AuthController.login` | Route handler, parses + validates input |
| `AuthService.login` | Core logic: rate limit check, credential verify, session create |
| `InMemorySessionStore` | Session persistence (in-memory for dev/test) |
| `api-client.ts` (web) | `loginUser()` — calls POST /api/auth/login |
| `LoginPage` (web) | Login form UI, calls `loginUser` → `setAuth` |
| `AuthProvider` (web) | Persists `{ user, accessToken }` to localStorage |
| `@mixmatch/shared` | `LoginInput`, `AuthTokenResponse`, `loginSchema` |

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Missing email field | 400 VALIDATION_ERROR |
| Missing password field | 400 VALIDATION_ERROR |
| Empty request body | 400 VALIDATION_ERROR |
| Non-existent email | 401 UNAUTHORIZED (same message as wrong password) |
| Wrong password | 401 UNAUTHORIZED (same message as wrong email) |
| >5 failed attempts | 429 RATE_LIMITED with `retryAfter` seconds |
| Email normalization | Input is trimmed and lowercased by loginSchema |

## Testing

- API: `apps/api/src/modules/auth/tests/login.test.ts` (3 tests)
- API: `apps/api/src/modules/auth/tests/auth-edge-cases.test.ts` (login edge cases)
- Web: `apps/web/src/app/login/page.test.tsx` (7 tests)
