import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import { SSE_TOKEN_TYPE, type SseTokenService } from './sse-token.service';

function buildContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

/** Accepts every token id by default; override `consume` to simulate a replay. */
function buildSseTokenService(
  consume: jest.Mock = jest.fn().mockReturnValue(true),
) {
  return { consume } as unknown as SseTokenService;
}

function buildGuard(
  jwtService: unknown,
  sseTokenService: SseTokenService = buildSseTokenService(),
): JwtAuthGuard {
  return new JwtAuthGuard(jwtService as JwtService, sseTokenService);
}

describe('JwtAuthGuard', () => {
  it('authenticates via the Authorization header', () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1', role: 'USER' }),
    };
    const guard = buildGuard(jwtService);
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer header-token' },
      query: {},
    };

    expect(guard.canActivate(buildContext(request))).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('header-token');
    expect(request.userId).toBe('user-1');
    expect(request.userRole).toBe('USER');
  });

  it('accepts a single-use SSE token via a ?token= query param (for EventSource)', () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({
        sub: 'user-1',
        role: 'ADMIN',
        typ: SSE_TOKEN_TYPE,
        jti: 'jti-1',
        exp: 1_800_000_000,
      }),
    };
    const consume = jest.fn().mockReturnValue(true);
    const guard = buildGuard(jwtService, buildSseTokenService(consume));
    const request: Partial<AuthenticatedRequest> = {
      headers: {},
      query: { token: 'sse-token' },
    };

    expect(guard.canActivate(buildContext(request))).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('sse-token');
    expect(consume).toHaveBeenCalledWith('jti-1', 1_800_000_000);
    expect(request.userId).toBe('user-1');
  });

  it('rejects a standard access token supplied in a ?token= query param', () => {
    const jwtService = {
      verify: jest.fn().mockReturnValue({ sub: 'user-1', role: 'ADMIN' }),
    };
    const guard = buildGuard(jwtService);
    const request: Partial<AuthenticatedRequest> = {
      headers: {},
      query: { token: 'access-token' },
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an SSE token that has already been used', () => {
    const jwtService = {
      verify: jest
        .fn()
        .mockReturnValue({ sub: 'user-1', typ: SSE_TOKEN_TYPE, jti: 'jti-1' }),
    };
    const guard = buildGuard(
      jwtService,
      buildSseTokenService(jest.fn().mockReturnValue(false)),
    );
    const request: Partial<AuthenticatedRequest> = {
      headers: {},
      query: { token: 'sse-token' },
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an SSE token presented as an Authorization bearer token', () => {
    const jwtService = {
      verify: jest
        .fn()
        .mockReturnValue({ sub: 'user-1', typ: SSE_TOKEN_TYPE, jti: 'jti-1' }),
    };
    const guard = buildGuard(jwtService);
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer sse-token' },
      query: {},
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('prefers the Authorization header over a query token when both are present', () => {
    const jwtService = { verify: jest.fn().mockReturnValue({ sub: 'user-1' }) };
    const guard = buildGuard(jwtService);
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer header-token' },
      query: { token: 'query-token' },
    };

    guard.canActivate(buildContext(request));

    expect(jwtService.verify).toHaveBeenCalledWith('header-token');
  });

  it('throws when neither a header nor a query token is present', () => {
    const jwtService = { verify: jest.fn() };
    const guard = buildGuard(jwtService);
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
    const guard = buildGuard(jwtService);
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
    const guard = buildGuard(jwtService);
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: 'Bearer token' },
      query: {},
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(
      UnauthorizedException,
    );
  });
});
