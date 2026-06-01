# Auth Abuse Controls — Monorepo Guide

## Overview

This document maps the auth abuse-control layer across `apps/api`, `apps/web`, and `apps/mobile`. All surfaces share the same type contracts from `packages/types` so throttle notices, cooldown states, and session-risk signals use consistent field names and response shapes end to end.

## Shared contracts (`packages/types`)

| Type | Purpose |
|------|---------|
| `ThrottleNotice` | Throttle state returned on and after failed credential attempts |
| `SessionRiskNotice` | Risk signal surfaced when unusual activity is detected |
| `AuthAbuseCooldown` | Per-credential lockout state including reset timestamp |
| `AuthFailureEnvelope` | Unified failure envelope that carries all three notices |

## API layer (`apps/api`)

### Middleware

| File | Route | Behavior |
|------|-------|---------|
| `src/middleware/auth-throttle.ts` | `POST /api/v1/auth/login` | Checks and records per-credential failure counts |
| `src/middleware/auth-throttle.ts` | `POST /api/v1/auth/register` | Blocks repeated registration abuse from the same IP |

### Failure response shape

When the credential is locked out (HTTP 429):

```json
{
  "success": false,
  "code": "AUTH_RATE_LIMITED",
  "message": "Too many failed attempts — please wait before trying again.",
  "throttle": {
    "throttled": true,
    "retryAfter": 847,
    "attemptsRemaining": 0
  },
  "cooldown": {
    "active": true,
    "resetAt": "2026-06-01T12:15:00.000Z",
    "reason": "too_many_attempts",
    "failedAttempts": 5
  }
}
```

When a failure is recorded but lockout has not yet triggered:

```json
{
  "success": false,
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "Invalid email or password",
  "throttle": {
    "throttled": false,
    "attemptsRemaining": 3
  }
}
```

### Limits

| Surface | Window | Max failures | Lockout |
|---------|--------|-------------|---------|
| Login per email | 15 min | 5 | 15 min |
| Register per email | 15 min | 5 | 15 min |

These are tuned for an MVP starter. Swap `_throttleStore` for a Redis-backed implementation in production.

## Web client (`apps/web`)

### Throttle handling

`apps/web/auth/use-auth-notices.ts` exports `extractAuthNotices` and `formatThrottleMessage`. Both login and signup pages call these to surface typed UI notices:

```tsx
const notices = extractAuthNotices(caught);
const throttleMsg = formatThrottleMessage(notices.throttleNotice);
setError(throttleMsg ?? notices.displayMessage ?? caught.message);
```

When throttled, inputs are disabled and the submit button reads "Try again later" to prevent further attempts.

## Mobile client (`apps/mobile`)

The same pattern runs in `apps/mobile/src/auth/useAuthNotices.ts`. Both clients consume `AuthFailureEnvelope` from `@themixmatch/types` — field names are identical so the shared contracts are the single source of truth.

## Session-risk notices

`SessionRiskNotice` is reserved for cases where the API detects anomalous patterns (multiple failures across sessions, unusual timing). The current implementation does not emit these automatically — add them to `login.handler.ts` when a risk-scoring system is in place. The client-side handling is already wired.

## Extension points

- Swap `_throttleStore` (in-memory `Map`) for Redis/DB via the same interface — no callers change.
- Add a `risk` field to the `AuthFailureEnvelope` returned by `login.handler.ts` when a risk signal fires.
- Attach `cooldown.reason: "suspicious_activity"` for IP-level blocks rather than credential-level blocks.
- Wire `Retry-After` header into the mobile/web retry countdown for a better UX.

## Related docs

- [Authentication](./AUTHENTICATION.md)
- [Stellar Auth Safety](./STELLAR_AUTH_SAFETY.md)
- [Session Lifecycle](../../../docs/SESSION_LIFECYCLE.md)
