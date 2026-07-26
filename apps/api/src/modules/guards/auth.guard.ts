import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from '../auth.service';

/**
 * Core Auth Guard for MixMatch-Onchain.
 * Intercepts incoming requests, validates bearer tokens,
 * and attaches authenticated user payload to the execution context.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if endpoint is decorated with @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. Extract Authorization header
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      // 3. Verify core token signature/claims
      const user = await this.authService.verifyAccessToken(token);
      
      // 4. Attach user context to request
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}