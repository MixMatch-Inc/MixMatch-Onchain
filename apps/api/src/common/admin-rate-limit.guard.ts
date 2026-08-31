import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * #919: Stricter rate limit guard for admin routes.
 *
 * General API endpoints rely on whatever upstream proxy/ALB rate limiting is
 * in place. Admin approve/reject endpoints handle high-value financial
 * operations and need an additional layer: this guard allows at most
 * `ADMIN_MAX_REQUESTS` requests per `ADMIN_WINDOW_MS` per IP address before
 * returning 429 Too Many Requests.
 *
 * Defaults: 20 requests / 60 seconds per IP.
 *
 * Apply to a controller or individual route with `@UseGuards(AdminRateLimitGuard)`.
 */
@Injectable()
export class AdminRateLimitGuard implements CanActivate {
  private static readonly ADMIN_MAX_REQUESTS = 20;
  private static readonly ADMIN_WINDOW_MS = 60_000; // 1 minute

  /** ip → { count, windowStart } */
  private readonly hits = new Map<
    string,
    { count: number; windowStart: number }
  >();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip =
      (request.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      request.socket.remoteAddress ??
      'unknown';

    const now = Date.now();
    const entry = this.hits.get(ip);

    if (
      !entry ||
      now - entry.windowStart > AdminRateLimitGuard.ADMIN_WINDOW_MS
    ) {
      this.hits.set(ip, { count: 1, windowStart: now });
      return true;
    }

    entry.count += 1;
    if (entry.count > AdminRateLimitGuard.ADMIN_MAX_REQUESTS) {
      // @nestjs/common has no built-in TooManyRequestsException; throw a
      // plain HttpException with the 429 status instead.
      throw new HttpException(
        'Too many admin requests — please wait before retrying',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
