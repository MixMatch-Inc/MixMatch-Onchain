import express from 'express';
import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { rateLimit } from '../rate-limit.middleware.js';
import { InMemoryRateLimitStore, RateLimiter } from '../rate-limiter.service.js';

describe('rateLimit middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.get('/test', rateLimit('public'), (_req, res) => {
      res.status(200).json({ ok: true });
    });
  });

  it('allows requests within the limit', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('sets rate limit headers', async () => {
    const res = await request(app).get('/test');
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    const config = { windowMs: 60_000, maxRequests: 2 };
    const store = new InMemoryRateLimitStore();
    const limiter = new RateLimiter(store, config);

    await limiter.check('test');
    await limiter.check('test');
    const info = await limiter.check('test');
    expect(limiter.isAllowed(info)).toBe(false);
  });

  it('includes retry-after header on rate limit', async () => {
    const store = new InMemoryRateLimitStore();
    const limiter = new RateLimiter(store, { windowMs: 60_000, maxRequests: 0 });

    const info = await limiter.check('limited');
    expect(info.remaining).toBe(0);
  });

  it('uses different buckets independently', async () => {
    const app2 = express();
    app2.get('/auth', rateLimit('auth'), (_req, res) => res.json({ ok: true }));
    app2.get('/api', rateLimit('api'), (_req, res) => res.json({ ok: true }));

    const resAuth = await request(app2).get('/auth');
    const resApi = await request(app2).get('/api');
    expect(resAuth.status).toBe(200);
    expect(resApi.status).toBe(200);
  });
});
