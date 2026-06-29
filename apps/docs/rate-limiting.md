# Rate Limiting

## Overview

Rate limiting protects API endpoints from abuse by restricting the number of
requests a client can make within a given time window. The implementation uses
a sliding-window algorithm with configurable buckets.

## Buckets

| Bucket   | Window | Max Requests | Applied To        |
| -------- | ------ | ------------ | ----------------- |
| `auth`   | 15 min | 20           | `/api/auth/*`     |
| `api`    | 1 min  | 100          | General API routes|
| `public` | 1 min  | 30           | Public endpoints  |

## Response Headers

Every rate-limited endpoint returns these headers:

| Header                  | Description                          |
| ----------------------- | ------------------------------------ |
| `X-RateLimit-Limit`     | Max requests allowed in the window   |
| `X-RateLimit-Remaining` | Requests remaining in the window     |
| `X-RateLimit-Reset`     | Unix timestamp when the window resets|
| `Retry-After`           | Seconds to wait (only on 429)        |

## Error Response

When the limit is exceeded, the API returns HTTP 429:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 47
  }
}
```

## Usage

Rate limiting applies automatically via middleware. To add rate limiting to
a new route group, attach the middleware in the router:

```ts
import { rateLimit } from '../modules/rate-limit/rate-limit.middleware.js';

router.get('/sensitive', rateLimit('auth'), handler);
```

## Edge Cases

- **Distributed environments**: The default store is in-memory. For multi-instance
  deployments, implement `RateLimitStore` with Redis or similar.
- **IP behind proxy**: The middleware respects `X-Forwarded-For` when available.
- **Cleanup**: Expired entries are purged on each check to prevent memory leaks.
