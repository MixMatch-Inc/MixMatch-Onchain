import type { Request, Response, NextFunction } from "express";
import type { AuthRateLimitError } from "@themixmatch/types";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Max requests per window. */
  maxRequests: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Optional key extractor — defaults to `req.ip`. */
  keyFn?: (req: Request) => string;
}

function createStore() {
  const store = new Map<string, RateLimitEntry>();
  return {
    hit(key: string, windowMs: number): RateLimitEntry {
      const now = Date.now();
      const existing = store.get(key);
      if (!existing || now >= existing.resetAt) {
        const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
        store.set(key, entry);
        return entry;
      }
      existing.count++;
      return existing;
    },
    get(key: string): RateLimitEntry | undefined {
      return store.get(key);
    },
    clear() {
      store.clear();
    },
  };
}

export const _rateLimitStore = createStore();

/**
 * Creates an Express middleware that enforces a sliding-window request limit.
 *
 * Keyed by IP by default. Exceeded callers receive a 429 with `Retry-After`
 * and an `AuthRateLimitError` envelope so clients can surface a typed notice.
 */
export function createRateLimit(options: RateLimitOptions) {
  const { maxRequests, windowMs, keyFn } = options;

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const key = keyFn ? keyFn(req) : (req.ip ?? "unknown");
    const entry = _rateLimitStore.hit(key, windowMs);

    const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);

    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      res.setHeader("Retry-After", String(retryAfter));
      const body: { success: false } & AuthRateLimitError = {
        success: false,
        code: "AUTH_RATE_LIMITED",
        message: "Too many requests — please wait before retrying.",
        retryAfter,
      };
      res.status(429).json(body);
      return;
    }

    next();
  };
}

/** Pre-configured limiter for public auth endpoints (10 req / 15 min per IP). */
export const authRateLimit = createRateLimit({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
});

/** Stricter limiter for Stellar challenge/verify endpoints (5 req / 15 min per IP). */
export const stellarAuthRateLimit = createRateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
});
