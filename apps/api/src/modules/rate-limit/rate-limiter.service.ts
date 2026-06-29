import type { RateLimitConfig, RateLimitInfo, RateLimitStore } from '@mixmatch/shared';
import { RATE_LIMIT_CONFIG, type BucketEntry, type RateLimitBucket } from './rate-limit.types.js';

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, BucketEntry>();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: Date }> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt.getTime() < now) {
      const resetAt = new Date(now + windowMs);
      this.buckets.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }

    existing.count++;
    return { count: existing.count, resetAt: existing.resetAt };
  }

  async decrement(key: string): Promise<void> {
    const existing = this.buckets.get(key);
    if (existing && existing.count > 0) {
      existing.count--;
    }
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.buckets) {
      if (entry.resetAt.getTime() < now) {
        this.buckets.delete(key);
      }
    }
  }
}

export class RateLimiter {
  constructor(
    private readonly store: RateLimitStore,
    private readonly config: RateLimitConfig,
  ) {}

  async check(key: string): Promise<RateLimitInfo> {
    const result = await this.store.increment(key, this.config.windowMs);
    const remaining = Math.max(0, this.config.maxRequests - result.count);
    const retryAfterMs = Math.max(0, result.resetAt.getTime() - Date.now());

    return {
      limit: this.config.maxRequests,
      remaining,
      resetAt: result.resetAt,
      retryAfterMs,
    };
  }

  isAllowed(info: RateLimitInfo): boolean {
    return info.remaining > 0;
  }
}

export function createRateLimiter(bucket: RateLimitBucket): RateLimiter {
  const config = RATE_LIMIT_CONFIG[bucket];
  return new RateLimiter(new InMemoryRateLimitStore(), {
    windowMs: config.windowMs,
    maxRequests: config.maxRequests,
  });
}
