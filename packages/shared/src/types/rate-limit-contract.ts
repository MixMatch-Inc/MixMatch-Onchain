/**
 * Rate Limiting — Scope & Contracts
 *
 * Track: rate limiting  |  Sprint 1  |  issue #794 (implement the core flow)
 *
 * Extends the shared rate-limit types with the contract definition used by
 * the API middleware layer. This file documents the boundary, inputs, and
 * outputs for the rate-limiting workstream.
 *
 * Implementation lives in:
 *   apps/api/src/modules/rate-limit/rate-limit.middleware.ts
 *   apps/api/src/modules/rate-limit/rate-limiter.service.ts
 */

/**
 * HTTP response headers set by the rate-limit middleware on every request.
 *
 * Conforms to the IETF RateLimit header fields draft:
 * https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers
 */
export interface RateLimitHeaders {
  /** Maximum number of requests allowed in the current window */
  "X-RateLimit-Limit": number;
  /** Requests remaining in the current window */
  "X-RateLimit-Remaining": number;
  /** Unix timestamp (seconds) when the current window resets */
  "X-RateLimit-Reset": number;
  /** Seconds until the client may retry (only present on 429 responses) */
  "Retry-After"?: number;
}

/**
 * Shape of the 429 error body returned when rate limit is exceeded.
 */
export interface RateLimitExceededBody {
  error: {
    code: "RATE_LIMITED";
    message: string;
    /** Seconds until the client may retry */
    retryAfter: number;
  };
}

/**
 * Key extraction strategies supported by the rate-limit middleware.
 * The middleware currently uses IP-based keying.
 */
export type RateLimitKeyStrategy =
  | "ip"          // client IP (default); uses x-forwarded-for if behind a proxy
  | "user-id"     // authenticated user ID (future — requires requireAuth to run first)
  | "custom";     // caller-supplied key extractor function
