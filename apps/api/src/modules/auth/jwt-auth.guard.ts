import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@mixmatch/shared';
import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  role?: UserRole;
}

export interface AuthenticatedRequest extends Request {
  userId: string;
  /** Absent on tokens issued before role claims existed — treated as `'USER'` by `RolesGuard`. */
  userRole?: UserRole;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    // EventSource (used for the SSE transaction stream) can't set custom
    // headers, so it authenticates via a `?token=` query param instead.
    // Only used as a fallback when there's no Authorization header — a
    // normal request with a bad/missing header still 401s as before.
    const queryToken =
      typeof request.query.token === 'string' ? request.query.token : undefined;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length)
      : queryToken;

    if (!token) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      if (!payload.sub) {
        throw new UnauthorizedException('Token is missing a subject claim');
      }
      request.userId = payload.sub;
      request.userRole = payload.role;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
