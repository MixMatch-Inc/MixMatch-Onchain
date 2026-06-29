# Session Lifecycle

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
expiry, and returns a fresh access token. The refresh token itself is **not**
rotated (simplification for v1).

## Session Expiry

| Token          | Lifetime  | Server-side | Revocable |
| -------------- | --------- | ----------- | --------- |
| Access token   | `1h`      | No (stateless JWT) | No       |
| Refresh token  | `7d`      | Yes (in-memory Map) | Yes      |

A session is considered expired when its refresh token has passed the 7-day
window. Expired refresh tokens are pruned on read and via periodic cleanup.

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

## Troubleshooting

| Symptom | Likely Cause |
| ------- | ------------ |
| `401 UNAUTHORIZED` on `/me` | No `Authorization` header or invalid token |
| `401` on a guarded route | Token expired; call `/refresh` first |
| `403 INSUFFICIENT_PERMISSIONS` | User role does not match `requireRole` |
| `403` on `/profile/:id` | `req.params.id` does not match the token's `sub` |
| `400` on ownership check | `:id` route param is missing or empty |
