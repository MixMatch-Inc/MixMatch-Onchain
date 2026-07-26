import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth.service';

describe('AuthGuard — Regression Test Suite', () => {
  let guard: AuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };
    const mockAuthService = {
      verifyAccessToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    guard = module.get(AuthGuard);
    reflector = module.get(Reflector);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── 1. Public Route Bypasses ───────────────────────────────────────────

  describe('Public Route Handling', () => {
    it('should allow access when @Public() decorator is present on handler', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext({ headers: {} });

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(authService.verifyAccessToken).not.toHaveBeenCalled();
    });
  });

  // ─── 2. Header Validation Edge Cases ────────────────────────────────────

  describe('Authorization Header Validation', () => {
    it('should throw UnauthorizedException when authorization header is missing', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({ headers: {} });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Missing or malformed Authorization header'),
      );
    });

    it('should throw UnauthorizedException when scheme is not Bearer', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Missing or malformed Authorization header'),
      );
    });

    it('should throw UnauthorizedException when Bearer token is empty', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({
        headers: { authorization: 'Bearer ' },
      });

      authService.verifyAccessToken.mockRejectedValue(new Error('Empty token'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── 3. Token Verification & Context Injection ─────────────────────────

  describe('Token Verification & Context Attachment', () => {
    it('should verify token, attach user object to request, and return true (Happy Path)', async () => {
      const mockUser = { address: 'GABCD1234567890', role: 'user' };
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.verifyAccessToken.mockResolvedValue(mockUser);

      const mockRequest = { headers: { authorization: 'Bearer valid-jwt-token' } };
      const context = createMockContext(mockRequest);

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(authService.verifyAccessToken).toHaveBeenCalledWith('valid-jwt-token');
      expect((mockRequest as any).user).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when token verification fails or is expired', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      authService.verifyAccessToken.mockRejectedValue(
        new Error('Token expired'),
      );

      const context = createMockContext({
        headers: { authorization: 'Bearer expired-token' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired authentication token'),
      );
    });
  });
});

function createMockContext(request: any): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}