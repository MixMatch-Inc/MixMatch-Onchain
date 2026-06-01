# Stellar Auth Safety and Incident-Handling Guide

## Overview

The Stellar-aware auth boundary (`apps/api` → `apps/stellar-service`) enforces abuse controls, emits a structured audit trail, and returns typed risk notices so clients can present meaningful feedback without guessing at error semantics.

## Shared contracts (`packages/types`)

| Type | Purpose |
|------|---------|
| `AuthAuditEntry` | Structured event emitted on every auth boundary interaction |
| `AuthAuditEventKind` | Enum of recordable event kinds (`stellar_challenge`, `stellar_verify`, `rate_limited`, …) |
| `AuthRateLimitError` | Returned when a caller exceeds the configured request limit (HTTP 429) |
| `StellarAuthRiskNotice` | User-facing notice attached to throttle, session-risk, and service-failure responses |

## Rate limiting

Both `apps/api` and `apps/stellar-service` enforce independent per-IP rate limits on challenge/verify routes.

| Layer | Limit | Window |
|-------|-------|--------|
| API proxy (`apps/api`) | 5 req / IP | 15 min |
| Stellar service (`apps/stellar-service`) | 5 req / IP | 15 min |

Response headers on every request:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1748800000
```

When the limit is exceeded:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 847

{
  "success": false,
  "code": "AUTH_RATE_LIMITED",
  "message": "Too many requests — please wait before retrying.",
  "retryAfter": 847
}
```

Clients should read `retryAfter` (seconds) and surface a cooldown notice rather than retrying immediately.

## Audit trail

Every auth event at the Stellar boundary emits a structured JSON line to stdout:

```json
{
  "audit": {
    "event": "stellar_challenge",
    "ip": "127.0.0.1",
    "timestamp": "2026-06-01T12:00:00.000Z",
    "boundary": "stellar",
    "meta": { "keyPrefix": "GABCDEFG" }
  }
}
```

Recorded event kinds at this boundary:

- `stellar_challenge` — challenge request received
- `stellar_verify` — verify request received
- `login_success` — session verified successfully
- `login_failure` — invalid session token, invalid key, or service unreachable
- `rate_limited` — request rejected by rate limiter

In production, pipe stdout to a log aggregator (Datadog, Loki, CloudWatch). The JSON structure is stable — swap the `console.log` call in `audit-log.ts` for a transport without changing callers.

## Risk notices

Failed and degraded responses carry a typed `StellarAuthRiskNotice` so clients can display specific guidance:

| `type` | Meaning | Suggested `action` |
|--------|---------|-------------------|
| `rate_limited` | IP has exceeded the request limit | `retry_later` |
| `invalid_key` | Stellar public key failed validation | `retry_later` |
| `service_unavailable` | `apps/stellar-service` is unreachable | `retry_later` |
| `session_risk` | Session token rejected by the Stellar boundary | `re_authenticate` |

Example `service_unavailable` response:

```json
{
  "success": false,
  "code": "STELLAR_SERVICE_UNAVAILABLE",
  "notice": {
    "type": "service_unavailable",
    "message": "Stellar service is unavailable — please retry shortly.",
    "action": "retry_later"
  }
}
```

## Recovery behavior under failure

When `apps/stellar-service` is unavailable:

1. `apps/api` returns HTTP 502 with `code: STELLAR_SERVICE_UNAVAILABLE`.
2. The wallet-linking flow is blocked but the core auth session (JWT) remains valid.
3. Clients should degrade gracefully — let users continue with email/password auth while surfacing the `service_unavailable` notice for the Stellar flow.

This design intentionally does **not** couple the primary session to Stellar availability so that auth remains functional even when the Stellar boundary is down.

## Environment variables

| Variable | Default | Notes |
|----------|---------|-------|
| `STELLAR_SERVICE_URL` | `http://localhost:3002` | API proxy target |
| `STELLAR_SERVICE_PORT` | `3002` | Stellar service listen port |

## Extension points

- Rate-limit store is in-memory — swap `_rateLimitStore` for a Redis-backed store via the same interface.
- Audit entries go to stdout — replace `logAuthEvent` body with a structured logger or event-bus emit.
- Challenge signature verification is a stub — on-chain validation is a follow-up milestone.
- Add IP allowlisting or CAPTCHA gate at the `stellarAuthRateLimit` layer for production hardening.

## Related docs

- [Authentication](./AUTHENTICATION.md)
- [Stellar Auth Boundary](../../stellar-service/docs/STELLAR_AUTH_BOUNDARY.md)
