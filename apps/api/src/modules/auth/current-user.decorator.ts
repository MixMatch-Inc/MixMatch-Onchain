import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@mixmatch/shared';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/** Extracts the authenticated user's id, set by `JwtAuthGuard`. */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.userId;
  },
);

/**
 * Extracts the authenticated user's role, set by `JwtAuthGuard`. Undefined
 * on tokens issued before role claims existed — callers should treat that
 * as `'USER'`, the same way `RolesGuard` does.
 */
export const CurrentUserRole = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserRole | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.userRole;
  },
);
