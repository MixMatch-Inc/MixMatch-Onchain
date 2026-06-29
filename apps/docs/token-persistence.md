# Token Persistence

## Overview

The auth flow uses a two-token strategy:

| Token          | Lifetime        | Storage                  | Purpose                              |
|----------------|-----------------|--------------------------|--------------------------------------|
| Access token   | 1 hour (JWT)    | `localStorage` (browser) | Authenticates API requests           |
| Refresh token  | 7 days (opaque) | `localStorage` (browser) | Obtains new access tokens when they expire |

Both tokens are returned from `POST /api/auth/register` and
`POST /api/auth/login`. The refresh token is also rotated on every
successful refresh (old token is revoked, a new one is issued).

---

## Data Flow

### Login / Registration

```
Client (login/register page)
  → POST /api/auth/login (or /register)
  → AuthService.login → SessionService.createSession
    → JWT access token (1h) + opaque refresh token (7d)
  → Response: { user, accessToken, refreshToken }
  → AuthContext.setAuth stores in localStorage under "mixmatch.auth"
```

### Authenticated Request

```
Client (any page)
  → fetchWithAuth('/api/auth/me')
  → Checks access token expiry (decodes JWT locally)
  → If valid: GET /api/auth/me with Authorization: Bearer <accessToken>
  → If expired: refreshes tokens first, then retries
```

### Token Refresh

```
Client
  → access token is expired or returns 401
  → POST /api/auth/refresh { refreshToken }
  → SessionService.refreshSession
    → Validates refresh token, revokes old session, creates new one
  → Response: { user, accessToken, refreshToken }
  → AuthContext updates localStorage with new tokens
  → Original request retried with fresh access token
```

### Logout

```
Client
  → AuthContext.logout()
  → localStorage.removeItem('mixmatch.auth')
  → Tokens are discarded client-side
  → Refresh token remains valid server-side until TTL expiry (7 days)
```

---

## Token Storage

### Browser (`localStorage`)

The web app stores tokens in `window.localStorage` under the key
`mixmatch.auth`. The stored value is a JSON object:

```json
{
  "user": { "id": "...", "email": "user@example.com", "role": "user" },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Security considerations

- `localStorage` is accessible to any JavaScript on the same origin, making it
  vulnerable to XSS. Sanitise all user-rendered content to mitigate this.
- The access token is short-lived (1h), limiting the window of exposure.
- The refresh token is opaque (a UUID) and is rotated on each use, so even if
  stolen, it can only be used once before rotation.
- Server-side session revocation (when implemented as an endpoint) will
  invalidate refresh tokens immediately.

---

## Edge Cases & Hardening

### Expired token on page load

When the app mounts, the `AuthProvider` reads `localStorage` and checks the
access token's JWT `exp` claim. If expired, it attempts a background refresh:

- **Refresh succeeds**: tokens are replaced in localStorage, user stays logged in.
- **Refresh fails**: localStorage is cleared, user is logged out.

### Concurrent refresh requests

If multiple authenticated API calls are made simultaneously while the token
is expired, only one refresh request is sent. Subsequent calls wait for the
same in-flight refresh promise rather than triggering duplicate refreshes.

### Corrupted localStorage

If `localStorage` data cannot be parsed (invalid JSON, missing fields), the
entry is removed and the user is treated as unauthenticated.

### 401 after refresh

If a request returns 401 even after a successful token refresh (e.g., the user
was deleted or banned), the client clears localStorage and throws a
`SESSION_EXPIRED` error. The calling code should redirect to the login page.

### Network failure during refresh

If the refresh endpoint is unreachable, the client throws an error. The
calling code should handle this gracefully (e.g., show a "connection lost"
message rather than immediately logging the user out).

---

## Integration points

- **Auth context**: `apps/web/src/lib/auth-context.tsx` (manages tokens in state
  and localStorage, exposes `fetchWithAuth`)
- **API client**: `apps/web/src/lib/api-client.ts` (`refreshAccessToken`,
  `fetchAuthenticated`)
- **Backend refresh endpoint**: `POST /api/auth/refresh`
- **Session service**: `apps/api/src/modules/auth/session.service.ts`
- **Session store**: `apps/api/src/modules/auth/session.store.ts`
- **Shared types**: `packages/shared/src/types/auth.ts` (`AuthTokenResponse`)
