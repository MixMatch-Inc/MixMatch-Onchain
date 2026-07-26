# Signup Flow Integration

The signup flow connects the web client, API, shared types, and database.

## Architecture

```
Web Browser                      Express API                   PostgreSQL
     │                               │                           │
     │  POST /api/auth/register      │                           │
     │  { email, password }          │                           │
     │ ──────────────────────────►   │                           │
     │                               │  registerSchema.safeParse │
     │                               │  ▼ valid                  │
     │                               │  AuthService.register()   │
     │                               │    ├─ check duplicate     │
     │                               │    ├─ hash password       │
     │                               │    ├─ create user ──────► │
     │                               │    ├─ create session      │
     │                               │    └─ build token pair    │
     │                               │                           │
     │  201 { user, accessToken }    │                           │
     │ ◄──────────────────────────   │                           │
```

## Data Flow

| Step | Component | Action |
|------|-----------|--------|
| 1 | Web signup page | User fills email + password, clicks submit |
| 2 | `registerSchema` (Zod) | Client-side validation via `@mixmatch/shared` |
| 3 | `registerUser()` (api-client) | POST to `/api/auth/register` |
| 4 | `parseRegisterInput` (validator) | Server-side validation with same Zod schema |
| 5 | `AuthService.register()` | Core business logic |
| 6 | `UserRepository.create()` | Persist to PostgreSQL via Prisma |
| 7 | `SessionService.createSession()` | Issue JWT + refresh token |
| 8 | Response → web client | `{ user: AuthUser, accessToken: string }` |
| 9 | `AuthProvider.setAuth()` | Persist to `localStorage`, update React context |

## Contracts

| Contract | Location | Description |
|----------|----------|-------------|
| `RegisterSchema` (Zod) | `@mixmatch/shared` | Email + password shape and validation rules |
| `RegisterInput` | `@mixmatch/shared` | TypeScript type for register request body |
| `AuthUser` | `@mixmatch/shared` | User object shape (no passwordHash) |
| `AuthTokenResponse` | `@mixmatch/shared` | Success response shape |
| `AuthFormValues` | `web/components/AuthForm.tsx` | Form state interface |
| `StoredAuth` | `web/lib/auth-context.tsx` | localStorage auth shape |

## Integration Points

| System | How signup connects |
|--------|-------------------|
| Shared types (`@mixmatch/shared`) | Provides `registerSchema`, `RegisterInput`, `AuthUser`, `AuthTokenResponse` |
| API auth module | `AuthController.register` → `AuthService.register` → `UserRepository.create` |
| Session service | Creates session after successful registration |
| Web app | `SignupPage` → `AuthForm` → `registerUser()` → `AuthProvider` |
| Mobile app (future) | `AuthShell` will use same `registerUser` pattern |
| Error handling | `ValidationError` (400), `ConflictError` (409 duplicate), `ApiError` (network) |

## Edge Cases Handled

| Scenario | Behaviour | Layer |
|----------|-----------|-------|
| Invalid email format | 400 VALIDATION_ERROR | Zod + controller |
| Password too short | 400 VALIDATION_ERROR | Zod + controller |
| Duplicate email | 409 CONFLICT | AuthService |
| Network failure (offline) | Caught in AuthForm, shown as alert | Web client |
| API returns non-JSON | Caught in api-client, wrapped in ApiError | Web client |
