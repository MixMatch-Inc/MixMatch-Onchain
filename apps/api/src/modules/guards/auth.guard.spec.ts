import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth.service';

describe('AuthGuard', () => {
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

  it('should allow access if route is marked as @Public()', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const mockContext = createMockContext(undefined);

    const canActivate = await guard.canActivate(mockContext);
    expect(canActivate).toBe(true);
  });

  it('should throw UnauthorizedException if header is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const mockContext = createMockContext(undefined);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should validate token and attach user to request object', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    authService.verifyAccessToken.mockResolvedValue({
      address: 'GABCD1234567890',
    });
    const mockRequest = { headers: { authorization: 'Bearer valid.jwt.token' } };
    const mockContext = createMockContext(mockRequest);

    const canActivate = await guard.canActivate(mockContext);
    expect(canActivate).toBe(true);
    expect((mockRequest as any).user).toEqual({ address: 'GABCD1234567890' });
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