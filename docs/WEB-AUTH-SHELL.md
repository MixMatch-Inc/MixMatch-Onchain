# Web Auth Shell — Scope & Contracts

## Purpose

The web auth shell provides the authentication boundary for the Next.js web app. It handles user registration, login, session persistence, and protected route access.

## Scope

- **AuthProvider** — React context that wraps the app and exposes auth state.
- **useAuth** — Hook that returns `{ user, accessToken, isLoading, setAuth, logout }`.
- **AuthForm** — Reusable form component for email + password submission.
- **api-client** — Functions for `/api/auth/register`, `/api/auth/login`, and `/api/auth/me`.

## Contracts

### AuthProvider

```
Input:  children: ReactNode
State:  user: AuthUser | null
        accessToken: string | null
        isLoading: boolean
Output: { user, accessToken, isLoading, setAuth, logout }
```

Storage: Persists `{ user, accessToken }` to `localStorage` under key `mixmatch.auth`.
Recovery: On mount, reads stored value; discards if:
- JSON parse fails
- `user` or `accessToken` is missing
- Token is expired (decoded JWT `exp` check)

### AuthForm

```
Input:  title: string
        submitLabel: string
        onSubmit: (values: { email: string; password: string }) => Promise<void>
        fieldErrors?: { email?: string; password?: string }
Output: form submission event → calls onSubmit → shows error or succeeds
```

Validation: Email input has `type="email"` and `required`; password has `required`.
Error handling: Server errors are caught and displayed as a general alert.

### API Client

```
registerUser(input: RegisterInput) → Promise<AuthTokenResponse>
loginUser(input: LoginInput)       → Promise<AuthTokenResponse>
me(token: string)                  → Promise<AuthUser>
```

All functions:
- Send `Content-Type: application/json`
- Throw `ApiError` on non-ok responses
- Use `NEXT_PUBLIC_API_URL` as base

### State Machine

```
[Loading] → (stored session found & valid) → [Authenticated]
[Loading] → (no stored session)            → [Unauthenticated]
[Loading] → (stored session expired)       → [Unauthenticated] (storage cleared)
[Authenticated] → logout()                 → [Unauthenticated]
[Unauthenticated] → setAuth(response)      → [Authenticated]
```

## Edge Cases

| Situation | Behaviour |
|-----------|-----------|
| Expired token on load | Cleared from localStorage, user sees login |
| Corrupted localStorage | `JSON.parse` fails → removed, user sees login |
| `localStorage.setItem` quota exceeded | Auth continues in memory (lost on refresh) |
| Network failure on login | ApiError message shown in form |
| Token missing from storage | Treated as unauthenticated |
