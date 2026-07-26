import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if route is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. Extract and sanitize Authorization header
    const request = context.switchToHttp().getRequest();
    const rawAuthHeader = request.headers.authorization;

    if (!rawAuthHeader || typeof rawAuthHeader !== 'string') {
      throw new UnauthorizedException('Authorization header is missing or invalid');
    }

    const trimmedHeader = rawAuthHeader.trim();
    if (!trimmedHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Malformed Authorization header scheme');
    }

    const token = trimmedHeader.slice(7).trim();

    // 3. Handle empty token strings / white space / null bytes
    if (!token || token.includes('\0')) {
      throw new UnauthorizedException('Authentication token cannot be empty');
    }

    try {
      // 4. Verify token with operational fault isolation
      const user = await this.authService.verifyAccessToken(token);
      request.user = user;
      return true;
    } catch (error: any) {
      // Handle transient system/network operational failures explicitly
      if (error.name === 'ServiceUnavailableException' || error.isTransient) {
        this.logger.error(`Auth service operational failure: ${error.message}`, error.stack);
        throw new ServiceUnavailableException('Authentication service temporarily unavailable');
      }

      // Default safe fail for authentication/verification failures
      throw new UnauthorizedException('Invalid, expired, or malformed authentication token');
    }
  }
}