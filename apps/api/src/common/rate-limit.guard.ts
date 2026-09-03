import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  RATE_LIMIT_METADATA_KEY,
  type RateLimitOptions,
} from './rate-limit.decorator';

/**
 * Per-IP fixed-window throttle for routes that are expensive or abusable
 * regardless of whether the caller is authenticated — most importantly
 * `POST /auth/register`, which is unauthenticated by definition and would
 * otherwise let anyone script unlimited account creation.
 *
 * Configure per route with `@RateLimit({ max, windowMs })`; a route with no
 * such metadata is left alone. Counters are in-process, so the effective
 * limit is `max` per instance — the same trade-off as `AdminRateLimitGuard`.
 * A shared store (Redis) is needed to make the limit global across a
 * horizontally scaled deployment, and this is a second layer regardless:
 * a CAPTCHA or upstream WAF is still the right answer for determined abuse.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  /** `route key` → `client ip` → fixed-window counter. */
  private readonly hits = new Map<
    string,
    Map<string, { count: number; windowStart: number }>
  >();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<
      RateLimitOptions | undefined
    >(RATE_LIMIT_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    // Keyed per handler so a shared guard instance doesn't let traffic to
    // one throttled route eat another's budget.
    const routeKey = `${context.getClass().name}.${context.getHandler().name}`;
    const ip = clientIp(request);

    let byIp = this.hits.get(routeKey);
    if (!byIp) {
      byIp = new Map();
      this.hits.set(routeKey, byIp);
    }

    const now = Date.now();
    const entry = byIp.get(ip);

    if (!entry || now - entry.windowStart > options.windowMs) {
      this.pruneExpired(byIp, now, options.windowMs);
      byIp.set(ip, { count: 1, windowStart: now });
      return true;
    }

    entry.count += 1;
    if (entry.count > options.max) {
      throw new HttpException(
        options.message ?? 'Too many requests — please wait before retrying',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  /**
   * Drops counters whose window has closed. Without this the map grows
   * without bound on an endpoint hit from many addresses, since a fixed
   * window never removes its own entries.
   */
  private pruneExpired(
    byIp: Map<string, { count: number; windowStart: number }>,
    now: number,
    windowMs: number,
  ): void {
    for (const [key, value] of byIp) {
      if (now - value.windowStart > windowMs) {
        byIp.delete(key);
      }
    }
  }
}

function clientIp(request: Request): string {
  return (
    (request.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]
      ?.trim() ??
    request.socket?.remoteAddress ??
    'unknown'
  );
}
