# Session Lifecycle

## Scope

The session lifecycle defines how user authentication state is created, maintained,
refreshed, and destroyed across the API and its clients. It covers token issuance,
token validation, session refresh, session revocation, and the constraints that
govern concurrent sessions.

## Why this contract matters

Without a clear session lifecycle, clients cannot reliably determine when a user
is logged in, when a token needs refreshing, or how to handle session expiry.
The lifecycle contract ensures that every client — web, mobile, future apps —
follows the same token flow and handles edge cases consistently.

## Token Issuance

When a user registers or logs in, the API issues a short-lived **access token**
(JWT) and a **refresh token**. The access token is signed with the user's `id`
and `role`, and expires according to `JWT_EXPIRES_IN` (default `1h`). The
refresh token is an opaque UUID stored server-side with a TTL of 7 days.

```
POST /api/auth/register
POST /api/auth/login

Response: { user, accessToken, refreshToken }
```

## Refresh Token Flow

Once the access token expires, the client can obtain a new one by sending the
refresh token to:

```
POST /api/auth/refresh
Body: { refreshToken: "<opaque-uuid>" }
```

The server validates the refresh token against its in-memory store, checks
expiry, and returns a fresh access token. The old refresh token is deleted and
a new one is issued (rotation). This ensures that a leaked refresh token cannot
be reused indefinitely.

## Session Expiry

| Token          | Lifetime  | Server-side | Revocable |
| -------------- | --------- | ----------- | --------- |
| Access token   | `1h`      | No (stateless JWT) | No       |
| Refresh token  | `7d`      | Yes (in-memory Map) | Yes      |

A session is considered expired when its refresh token has passed the 7-day
window. Expired refresh tokens are pruned on read and via periodic cleanup.

## Concurrent Session Limits

Each user is limited to a maximum of 5 active sessions. When the limit is
reached, new session creation is rejected with `401 INVALID_REFRESH_TOKEN`.
Existing sessions can be revoked to free up slots.

| Constraint | Value |
|------------|-------|
| Max concurrent sessions per user | 5 |
| Refresh token TTL | 7 days |
| Access token TTL | 1 hour (configurable via `JWT_EXPIRES_IN`) |

## How `requireAuth` Validates Tokens

The `requireAuth` middleware (defined in `auth.middleware.ts`) extracts the
`Authorization: Bearer <token>` header, verifies the JWT signature with
`jsonwebtoken`, and attaches `req.userId` and `req.role` to the request. If
the token is missing, malformed, expired, or signed with the wrong secret, a
`401 Unauthorized` error is thrown.

## How Auth Guard Builds on Top

The **auth guard** module (`auth.guard.ts`) composes on top of `requireAuth`:

- **`requireRole(role)`** — Checks `req.role` against the required `UserRole`
  enum (`USER`, `ADMIN`). Responds `403 INSUFFICIENT_PERMISSIONS` on mismatch.
- **`allowOwnership`** — Verifies `req.params.id === req.userId` for
  self-service routes. Responds `400` if the param is missing or `403` if the
  IDs do not match.

These guards are applied as Express middlewares before the route handler.

```
router.put('/profile/:id', requireAuth, allowOwnership, handler);
router.get('/admin', requireAuth, requireRole(UserRole.ADMIN), handler);
```

## Integration Points

| Component | Role |
|-----------|------|
| `session.service.ts` | Creates, refreshes, and revokes sessions |
| `session.store.ts` | Persists sessions (InMemory for tests, Prisma for production) |
| `session.types.ts` | Defines Session, TokenPair, SESSION_CONFIG |
| `auth.service.ts` | Orchestrates registration/login with session creation |
| `auth.middleware.ts` | Validates access tokens via JWT verification |
| `auth.guard.ts` | Composes role/ownership checks on top of requireAuth |

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Refresh token reused after rotation | 401 INVALID_REFRESH_TOKEN (old token deleted) |
| Refresh token expired | 401 INVALID_REFRESH_TOKEN, session deleted |
| Max sessions reached | 401 INVALID_REFRESH_TOKEN with "Maximum active sessions reached" |
| Revoke session that doesn't exist | 401 INVALID_REFRESH_TOKEN |
| Revoke all sessions for a user | All sessions deleted, other users unaffected |
| Access token expired but refresh valid | Client calls /refresh to get new access token |
| Both tokens expired | User must re-authenticate (login again) |

## Troubleshooting

| Symptom | Likely Cause |
| ------- | ------------ |
| `401 UNAUTHORIZED` on `/me` | No `Authorization` header or invalid token |
| `401` on a guarded route | Token expired; call `/refresh` first |
| `403 INSUFFICIENT_PERMISSIONS` | User role does not match `requireRole` |
| `403` on `/profile/:id` | `req.params.id` does not match the token's `sub` |
| `400` on ownership check | `:id` route param is missing or empty |
