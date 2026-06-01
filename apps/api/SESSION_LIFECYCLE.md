# Session Lifecycle Expectations

This baseline describes expected session behavior for contributors.

## Contract
- Login returns token + user payload.
- Protected routes (`/auth/me`, `/auth/onboarding`) require a valid bearer token.
- Missing/invalid token returns `401`.
- Expired/invalid session token should not crash clients; clients should clear local session and route to sign-in.

## Contributor Notes
- Keep auth failures deterministic and parseable.
- When adding protected routes, ensure middleware is shared and tested.
