import {
  Logger,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@mixmatch/shared';
import type { Request } from 'express';
import { SSE_TOKEN_TYPE, SseTokenService } from './sse-token.service';

export interface JwtPayload {
  sub: string;
  role?: UserRole;
  /** `'sse'` on a single-use stream token; absent on a standard access token. */
  typ?: string;
  /** Unique token id, present on SSE tokens so single use can be enforced. */
  jti?: string;
  /** Expiry, as an epoch-seconds timestamp, set by `jsonwebtoken`. */
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  userId: string;
  /** Absent on tokens issued before role claims existed — treated as `'USER'` by `RolesGuard`. */
  userRole?: UserRole;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sseTokenService: SseTokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    // EventSource (used for the SSE transaction stream) can't set custom
    // headers, so it authenticates via a `?token=` query param instead.
    // Only used as a fallback when there's no Authorization header — a
    // normal request with a bad/missing header still 401s as before.
    const queryToken =
      typeof request.query.token === 'string' ? request.query.token : undefined;
    const headerToken = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : undefined;
    const token = headerToken ?? queryToken;
    const viaQueryParam = headerToken === undefined && queryToken !== undefined;

    if (!token) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    let payload: JwtPayload;
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      if (!payload.sub) {
        throw new UnauthorizedException('Token is missing a subject claim');
      }
      request.userId = payload.sub;
      request.userRole = payload.role;
      return true;
    } catch (err) {
      const name =
        err instanceof Error ? err.name : '';

      if (name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      if (
        name === 'JsonWebTokenError' ||
        name === 'NotBeforeError'
      ) {
        Logger.warn(
          `JWT verification failed: ${err instanceof Error ? err.message : String(err)}`,
          JwtAuthGuard.name,
        );
        throw new UnauthorizedException({
          message: 'Invalid token',
          code: 'TOKEN_INVALID',
        });
      }
      // Unexpected error — re-throw so the global exception filter handles it.
      throw err;
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Token is missing a subject claim');
    }

    // A token in a URL leaks into proxy logs and browser history, so the
    // query-param path accepts only the short-lived single-use tokens from
    // `POST /auth/sse-token` — never the standard access token.
    if (viaQueryParam) {
      this.authorizeSseToken(payload);
    } else if (payload.typ === SSE_TOKEN_TYPE) {
      // Conversely, a stream token is not a general-purpose credential.
      throw new UnauthorizedException(
        'Stream tokens are only valid on the SSE stream endpoint',
      );
    }

    request.userId = payload.sub;
    request.userRole = payload.role;
    return true;
  }

  private authorizeSseToken(payload: JwtPayload): void {
    if (payload.typ !== SSE_TOKEN_TYPE || !payload.jti) {
      throw new UnauthorizedException(
        'A single-use stream token is required to authenticate via ?token= ' +
          '(obtain one from POST /auth/sse-token)',
      );
    }
    if (!this.sseTokenService.consume(payload.jti, payload.exp)) {
      throw new UnauthorizedException(
        'This stream token has already been used',
      );
    }
  }
}
