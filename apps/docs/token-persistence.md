# Token Persistence

## Scope

Token persistence covers how authentication tokens are stored, retrieved, and
validated on the client side after a successful login or registration.

## Storage Strategy

| Concern | Decision |
|---------|----------|
| Storage backend | `localStorage` (browser) — survives page reloads and tab closes |
| Storage key | `mixmatch.auth` |
| Stored shape | `{ user: AuthUser, accessToken: string }` |
| Serialization | `JSON.stringify` on write, `JSON.parse` on read |
| Corruption handling | Parse failure causes automatic removal from localStorage |
| Expiry handling | Not enforced client-side — token expiry is detected at the API via /me |

## Data Lifecycle

```
Register/Login
     │
     ▼
api-client returns { user, accessToken }
     │
     ▼
setAuth({ user, accessToken })
     ├── localStorage.setItem('mixmatch.auth', JSON.stringify(...))
     └── React context update (user + accessToken state)
     │
     ├── Subsequent page loads
     │   ├── AuthProvider mounts
     │   ├── localStorage.getItem('mixmatch.auth')
     │   ├── Parse → setUser / setAccessToken
     │   └── App sees logged-in state immediately
     │
     ├── getMe(accessToken)
     │   ├── GET /api/auth/me with Bearer token
     │   ├── 200 → user profile (session valid)
     │   ├── 401 → token expired/invalid → redirect to login
     │   └── 404 → user deleted → redirect to login
     │
     └── logout()
         ├── localStorage.removeItem('mixmatch.auth')
         └── React context clear (user → null, accessToken → null)
```

## Me Endpoint Integration

The `getMe()` function in `apps/web/src/lib/api-client.ts` validates the
persisted session against the server:

```typescript
import { getMe } from '@/lib/api-client';

// After rehydrating auth from localStorage on page load:
try {
  const { user } = await getMe(stored.accessToken);
  // session is still valid — user profile matches server
} catch (err) {
  if (err.code === 'TOKEN_EXPIRED' || err.code === 'INVALID_TOKEN') {
    // token no longer valid — redirect to login
  }
}
```

**Contract**

| | |
|-|-|
| **Endpoint** | `GET /api/auth/me` |
| **Auth** | `Authorization: Bearer <accessToken>` |
| **Success** | `200 { user: AuthUser }` |
| **Errors** | `401 INVALID_TOKEN`, `401 TOKEN_EXPIRED`, `404 NOT_FOUND` |

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| localStorage corrupted (invalid JSON) | AuthProvider silently removes the key, treats user as logged out |
| Token expired between page loads | getMe() returns 401 TOKEN_EXPIRED — app should redirect to login |
| User deleted by admin | getMe() returns 404 NOT_FOUND — app should clear auth and redirect |
| Multiple tabs | Each tab has its own AuthProvider; setAuth in one tab is not reflected in others without a storage event listener |
| Private browsing | localStorage is available but cleared when the last private tab closes |

## Testing

| File | Scope |
|------|-------|
| `apps/web/src/lib/__tests__/auth-context.test.tsx` | AuthProvider localStorage hydration, setAuth, logout (6 tests) |
| `apps/api/src/modules/auth/tests/me.test.ts` | API-level me endpoint: token validation, expiry, not found (6 tests) |
