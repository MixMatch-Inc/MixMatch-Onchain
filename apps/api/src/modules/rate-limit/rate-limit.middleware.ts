import type { NextFunction, Request, Response } from 'express';
import { createRateLimiter, type RateLimiter } from './rate-limiter.service.js';
import type { RateLimitBucket } from './rate-limit.types.js';

const limiterCache = new Map<string, RateLimiter>();

function getLimiter(bucket: RateLimitBucket): RateLimiter {
  if (!limiterCache.has(bucket)) {
    limiterCache.set(bucket, createRateLimiter(bucket));
  }
  return limiterCache.get(bucket)!;
}

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return `${ip}`;
}

export function rateLimit(bucket: RateLimitBucket) {
  const limiter = getLimiter(bucket);
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = clientKey(req);
    const info = await limiter.check(key);

    res.setHeader('X-RateLimit-Limit', info.limit);
    res.setHeader('X-RateLimit-Remaining', info.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetAt.getTime() / 1000).toString());

    if (!limiter.isAllowed(info)) {
      res.setHeader('Retry-After', Math.ceil(info.retryAfterMs / 1000).toString());
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(info.retryAfterMs / 1000),
        },
      });
      return;
    }

    next();
  };
}
