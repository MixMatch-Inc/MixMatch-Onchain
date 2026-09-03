import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** Requests allowed per client, per window. */
  max: number;
  /** Length of the fixed window, in milliseconds. */
  windowMs: number;
  /** Message returned with the 429. */
  message?: string;
}

/**
 * Throttles a route to `max` requests per `windowMs` per client IP.
 * Requires `RateLimitGuard` to be applied to the route or controller.
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, options);
