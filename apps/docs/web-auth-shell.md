# Web Auth Shell

## Purpose

The web auth shell is the client-side authentication boundary for the Next.js web app. It wraps all authenticated pages and provides a consistent auth context to the component tree.

## Boundaries

### What the shell owns
- Auth state management (current user, access token, loading state)
- Token persistence (localStorage read/write)
- Token validation on app load (`GET /api/auth/me`)
- Login / register / logout flows
- Auth API client functions

### What the shell delegates
- Form rendering → `AuthForm` component
- Page-level routing → Next.js App Router pages
- API communication → `api-client.ts`
- Shared schemas and types → `@mixmatch/shared`

## Interfaces

### AuthContextValue

```ts
interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  setAuth: (auth: StoredAuth) => void;
  logout: () => void;
}
```

### StoredAuth (localStorage shape)

```ts
interface StoredAuth {
  user: AuthUser;
  accessToken: string;
}
```

### API Client Contract

```ts
registerUser(input: RegisterInput): Promise<AuthTokenResponse>
loginUser(input: LoginInput): Promise<AuthTokenResponse>
getCurrentUser(accessToken: string): Promise<{ user: AuthUser }>
```

## Contracts

### Initialisation Flow
1. On app load, `AuthProvider` reads `mixmatch.auth` from localStorage.
2. If found, it calls `GET /api/auth/me` with the stored token to verify it is still valid.
3. On success → user and token are set in context, `isLoading` becomes `false`.
4. On failure (expired/invalid token) → localStorage is cleared, `isLoading` becomes `false`.
5. If no stored auth → `isLoading` becomes `false` immediately.

### Login Flow
1. User submits email/password on login page.
2. `POST /api/auth/login` is called.
3. On success → response (user + tokens) is stored via `setAuth`.
4. On failure → error is surfaced to the user via `AuthForm`.

### Logout Flow
1. `logout()` clears localStorage and resets context state to `null`.
2. No server-side session revocation is performed (tokens expire naturally).

### Registration Flow
1. User submits email/password on signup page.
2. `POST /api/auth/register` is called.
3. On success → response (user + tokens) is stored via `setAuth`.
4. On failure → error is surfaced to the user via `AuthForm`.

## Storage Key

```
mixmatch.auth
```

## Error Handling

All API errors are surfaced as `ApiError` instances with a `message` string. The `AuthForm` component displays the error in a `role="alert"` element.

## Edge Cases

| Scenario | Behaviour |
|---|---|
| localStorage corrupted | Removed silently, user treated as unauthenticated |
| Token expired between loads | Cleared silently, user redirected to login |
| API unreachable on initial load | Token cleared, user sees logged-out state |
| Multiple rapid login/setAuth calls | Last write wins (simple state overwrite) |
