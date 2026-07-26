export const RATE_LIMIT_CONFIG = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 20 },
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  public: { windowMs: 60 * 1000, maxRequests: 30 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMIT_CONFIG;

export interface BucketEntry {
  count: number;
  resetAt: Date;
}
