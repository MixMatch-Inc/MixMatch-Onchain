import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from './jwt-auth.guard';

function buildContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('authenticates via the Authorization header', () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1', role: 'USER' }),
    };
    const guard = new JwtAuthGuard(jwtService as unknown as JwtService);
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer header-token' },
      query: {},
    };

    expect(guard.canActivate(buildContext(request))).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('header-token');
    expect(request.userId).toBe('user-1');
    expect(request.userRole).toBe('USER');
  });

  it('falls back to a ?token= query param when no Authorization header is present (for EventSource)', () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1', role: 'ADMIN' }),
    };
    const guard = new JwtAuthGuard(jwtService as unknown as JwtService);
    const request: Partial<AuthenticatedRequest> = {
      headers: {},
      query: { token: 'query-token' },
    };

    expect(guard.canActivate(buildContext(request))).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('query-token');
    expect(request.userId).toBe('user-1');
  });

  it('prefers the Authorization header over a query token when both are present', () => {
    const jwtService = { verify: jest.fn().mockReturnValue({ sub: 'user-1' }) };
    const guard = new JwtAuthGuard(jwtService as unknown as JwtService);
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer header-token' },
      query: { token: 'query-token' },
    };

    guard.canActivate(buildContext(request));

    expect(jwtService.verify).toHaveBeenCalledWith('header-token');
  });

  it('throws when neither a header nor a query token is present', () => {
    const jwtService = { verify: jest.fn() };
    const guard = new JwtAuthGuard(jwtService as unknown as JwtService);
    const request: Partial<AuthenticatedRequest> = { headers: {}, query: {} };

    expect(() => guard.canActivate(buildContext(request))).toThrow(
      UnauthorizedException,
    );
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('throws when the token is invalid or expired', () => {
    const jwtService = {
      verify: jest.fn().mockImplementation(() => {
        throw new Error('expired');
      }),
    };
    const guard = new JwtAuthGuard(jwtService as unknown as JwtService);
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer bad-token' },
      query: {},
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws when the token has no subject claim', () => {
    const jwtService = { verify: jest.fn().mockReturnValue({}) };
    const guard = new JwtAuthGuard(jwtService as unknown as JwtService);
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer token' },
      query: {},
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(
      UnauthorizedException,
    );
  });
});
