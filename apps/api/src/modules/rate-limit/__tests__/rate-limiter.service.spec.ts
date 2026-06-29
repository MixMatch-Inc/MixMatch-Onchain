import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryRateLimitStore, RateLimiter } from '../rate-limiter.service.js';

describe('InMemoryRateLimitStore', () => {
  let store: InMemoryRateLimitStore;

  beforeEach(() => {
    store = new InMemoryRateLimitStore();
  });

  it('starts at count 1 for a new key', async () => {
    const result = await store.increment('test-key', 60_000);
    expect(result.count).toBe(1);
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('increments count for an existing key within the window', async () => {
    await store.increment('test-key', 60_000);
    const result = await store.increment('test-key', 60_000);
    expect(result.count).toBe(2);
  });

  it('resets count after the window expires', async () => {
    await store.increment('test-key', 1);
    await new Promise((resolve) => setTimeout(resolve, 2));
    const result = await store.increment('test-key', 60_000);
    expect(result.count).toBe(1);
  });

  it('decrements count', async () => {
    await store.increment('test-key', 60_000);
    await store.decrement('test-key');
    const result = await store.increment('test-key', 60_000);
    expect(result.count).toBe(1);
  });

  it('resets a key', async () => {
    await store.increment('test-key', 60_000);
    await store.reset('test-key');
    const result = await store.increment('test-key', 60_000);
    expect(result.count).toBe(1);
  });

  it('cleans up expired entries', async () => {
    await store.increment('expired-key', 1);
    await store.increment('valid-key', 60_000);
    await new Promise((resolve) => setTimeout(resolve, 2));
    store.cleanup();
    const expiredResult = await store.increment('expired-key', 60_000);
    expect(expiredResult.count).toBe(1);
  });
});

describe('RateLimiter', () => {
  it('allows requests within the limit', async () => {
    const store = new InMemoryRateLimitStore();
    const limiter = new RateLimiter(store, { windowMs: 60_000, maxRequests: 5 });

    const info = await limiter.check('key');
    expect(limiter.isAllowed(info)).toBe(true);
    expect(info.remaining).toBe(4);
    expect(info.limit).toBe(5);
  });

  it('blocks requests exceeding the limit', async () => {
    const store = new InMemoryRateLimitStore();
    const limiter = new RateLimiter(store, { windowMs: 60_000, maxRequests: 2 });

    await limiter.check('key');
    await limiter.check('key');
    const info = await limiter.check('key');
    expect(limiter.isAllowed(info)).toBe(false);
    expect(info.remaining).toBe(0);
  });

  it('tracks different keys independently', async () => {
    const store = new InMemoryRateLimitStore();
    const limiter = new RateLimiter(store, { windowMs: 60_000, maxRequests: 2 });

    await limiter.check('user-a');
    const infoA = await limiter.check('user-a');
    expect(limiter.isAllowed(infoA)).toBe(true);

    const infoB = await limiter.check('user-b');
    expect(infoB.remaining).toBe(1);
    expect(limiter.isAllowed(infoB)).toBe(true);
  });

  it('returns resetAt in the future', async () => {
    const store = new InMemoryRateLimitStore();
    const limiter = new RateLimiter(store, { windowMs: 60_000, maxRequests: 5 });

    const info = await limiter.check('key');
    expect(info.resetAt.getTime()).toBeGreaterThan(Date.now());
  });
});
