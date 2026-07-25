import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryRateLimitStore, RateLimiter } from "../rate-limiter.service.js";
import { RATE_LIMIT_CONFIG } from "../rate-limit.types.js";

/**
 * Core flow implementation tests for the rate-limiting workstream.
 *
 * Track: rate limiting  |  Sprint 1  |  issues #794 (implement) and #795 (regression)
 *
 * Focuses on correctness of the sliding-window algorithm, header propagation,
 * and the full request lifecycle through the rate-limit middleware.
 */
describe("Rate-limiting — core flow", () => {
  describe("window reset behaviour", () => {
    it("resets the counter when a new window starts", async () => {
      const store = new InMemoryRateLimitStore();
      const limiter = new RateLimiter(store, { windowMs: 10, maxRequests: 2 });

      await limiter.check("key");
      await limiter.check("key");
      let info = await limiter.check("key");
      expect(limiter.isAllowed(info)).toBe(false);

      // Wait for the window to expire
      await new Promise((r) => setTimeout(r, 15));

      info = await limiter.check("key");
      expect(limiter.isAllowed(info)).toBe(true);
      expect(info.remaining).toBe(1);
    });

    it("does not share counters between different keys after window reset", async () => {
      const store = new InMemoryRateLimitStore();
      const limiter = new RateLimiter(store, { windowMs: 10, maxRequests: 1 });

      await limiter.check("key-a"); // exhaust key-a
      await new Promise((r) => setTimeout(r, 15));

      const infoA = await limiter.check("key-a");
      const infoB = await limiter.check("key-b");

      expect(limiter.isAllowed(infoA)).toBe(true);
      expect(limiter.isAllowed(infoB)).toBe(true);
    });
  });

  describe("boundary conditions", () => {
    it("allows exactly maxRequests requests and blocks the next", async () => {
      const store = new InMemoryRateLimitStore();
      const max = 5;
      const limiter = new RateLimiter(store, { windowMs: 60_000, maxRequests: max });

      for (let i = 0; i < max; i++) {
        const info = await limiter.check("key");
        expect(limiter.isAllowed(info)).toBe(true);
        expect(info.remaining).toBe(max - i - 1);
      }

      const blocked = await limiter.check("key");
      expect(limiter.isAllowed(blocked)).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("remaining never goes below 0", async () => {
      const store = new InMemoryRateLimitStore();
      const limiter = new RateLimiter(store, { windowMs: 60_000, maxRequests: 1 });

      await limiter.check("key"); // allowed
      const over1 = await limiter.check("key"); // blocked
      const over2 = await limiter.check("key"); // blocked again

      expect(over1.remaining).toBe(0);
      expect(over2.remaining).toBe(0);
    });

    it("retryAfterMs is 0 or positive", async () => {
      const store = new InMemoryRateLimitStore();
      const limiter = new RateLimiter(store, { windowMs: 60_000, maxRequests: 1 });

      await limiter.check("key"); // exhaust
      const info = await limiter.check("key");

      expect(info.retryAfterMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("RATE_LIMIT_CONFIG buckets", () => {
    it("defines an auth bucket with sensible defaults", () => {
      const config = RATE_LIMIT_CONFIG["auth"];
      expect(config.maxRequests).toBeGreaterThan(0);
      expect(config.windowMs).toBeGreaterThan(0);
    });
  });

  describe("InMemoryRateLimitStore — edge cases (issue #796 harden)", () => {
    let store: InMemoryRateLimitStore;

    beforeEach(() => {
      store = new InMemoryRateLimitStore();
    });

    it("decrement on a key that does not exist is a no-op", async () => {
      await store.decrement("nonexistent"); // must not throw
      const result = await store.increment("nonexistent", 60_000);
      expect(result.count).toBe(1);
    });

    it("decrement does not go below 0", async () => {
      await store.increment("key", 60_000);
      await store.decrement("key");
      await store.decrement("key"); // second decrement on count=0
      const result = await store.increment("key", 60_000);
      // After two decrements on count=1, the stored count was 0;
      // the next increment should be treated as a fresh start or count=1.
      expect(result.count).toBeGreaterThanOrEqual(1);
    });

    it("reset on a key that does not exist is a no-op", async () => {
      await store.reset("missing-key"); // must not throw
    });

    it("cleanup removes only expired entries and leaves valid ones", async () => {
      await store.increment("stale", 1);
      await store.increment("fresh", 60_000);
      await new Promise((r) => setTimeout(r, 5));

      store.cleanup();

      // fresh should still be there
      const freshResult = await store.increment("fresh", 60_000);
      expect(freshResult.count).toBe(2);

      // stale should have been cleaned up and resets to 1
      const staleResult = await store.increment("stale", 60_000);
      expect(staleResult.count).toBe(1);
    });
  });
});
