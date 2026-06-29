import { describe, expect, it } from 'vitest';
import type {
  AuthUser,
  RegisterInput,
  LoginInput,
  AuthTokenResponse,
  TokenPair,
  Session,
  SessionConfig,
  AuditEntry,
  AuthErrorCode,
  AuthErrorResponse,
  UserRole,
  AuthGuardOptions,
  GuardResult,
  ValidationResult,
  RateLimitConfig,
  RateLimitInfo,
  RateLimitStore,
  RouteAccess,
  RouteProtectionContract,
} from '../index.js';

describe('type contracts', () => {
  it('AuthUser has the expected shape', () => {
    const user: AuthUser = {
      id: '1',
      email: 'a@b.com',
      role: 'USER',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    expect(user.id).toBe('1');
    expect(user.email).toBe('a@b.com');
    expect(user.role).toBe('USER');
  });

  it('RegisterInput has email and password', () => {
    const input: RegisterInput = { email: 'a@b.com', password: 'password123' };

    expect(input.email).toBe('a@b.com');
    expect(input.password).toBe('password123');
  });

  it('LoginInput has email and password', () => {
    const input: LoginInput = { email: 'a@b.com', password: 'secret' };

    expect(input.email).toBe('a@b.com');
    expect(input.password).toBe('secret');
  });

  it('AuthTokenResponse has user and accessToken', () => {
    const response: AuthTokenResponse = {
      user: { id: '1', email: 'a@b.com', role: 'USER', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
      accessToken: 'token-123',
    };

    expect(response.user.email).toBe('a@b.com');
    expect(response.accessToken).toBe('token-123');
  });

  it('TokenPair has accessToken and refreshToken', () => {
    const pair: TokenPair = { accessToken: 'at', refreshToken: 'rt' };

    expect(pair.accessToken).toBe('at');
    expect(pair.refreshToken).toBe('rt');
  });

  it('Session has the expected fields', () => {
    const session: Session = {
      id: 's1',
      userId: 'u1',
      refreshToken: 'rt',
      expiresAt: '2025-01-08T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
    };

    expect(session.id).toBe('s1');
    expect(session.userId).toBe('u1');
  });

  it('SessionConfig has expiry and max sessions', () => {
    const config: SessionConfig = { refreshTokenExpiryMs: 604800000, maxActiveSessions: 5 };

    expect(config.refreshTokenExpiryMs).toBe(604800000);
    expect(config.maxActiveSessions).toBe(5);
  });

  it('AuditEntry has required fields', () => {
    const entry: AuditEntry = {
      id: 'a1',
      action: 'USER_REGISTERED',
      actorId: 'u1',
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    expect(entry.action).toBe('USER_REGISTERED');
  });

  it('AuthErrorResponse has code and message', () => {
    const err: AuthErrorResponse = { code: 'INVALID_TOKEN' as AuthErrorCode, message: 'Bad token' };

    expect(err.code).toBe('INVALID_TOKEN');
  });

  it('AuthGuardOptions allow role and same-user options', () => {
    const opts: AuthGuardOptions = { requireRole: 'ADMIN' as UserRole, allowSameUser: true };

    expect(opts.requireRole).toBe('ADMIN');
  });

  it('GuardResult has allowed and optional reason', () => {
    const denied: GuardResult = { allowed: false, reason: 'Not admin' };

    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('Not admin');
  });

  it('ValidationResult works for success and failure', () => {
    const success: ValidationResult<string> = { success: true, data: 'ok' };
    const failure: ValidationResult<string> = { success: false, error: 'fail' };

    expect(success.success).toBe(true);
    expect(failure.success).toBe(false);
  });

  it('RateLimitConfig has window and max', () => {
    const config: RateLimitConfig = { windowMs: 900000, maxRequests: 20 };

    expect(config.windowMs).toBe(900000);
  });

  it('RateLimitInfo has limit, remaining, resetAt', () => {
    const info: RateLimitInfo = { limit: 20, remaining: 15, resetAt: new Date(), retryAfterMs: 0 };

    expect(info.remaining).toBe(15);
  });

  it('RateLimitStore interface is structurally sound', () => {
    const store: RateLimitStore = {
      increment: async () => ({ count: 1, resetAt: new Date() }),
      decrement: async () => {},
      reset: async () => {},
    };

    expect(store).toBeDefined();
  });

  it('RouteAccess can be public, authenticated, role, or ownership', () => {
    const pub: RouteAccess = { kind: 'public' };
    const auth: RouteAccess = { kind: 'authenticated' };
    const role: RouteAccess = { kind: 'role', role: 'ADMIN' };
    const owned: RouteAccess = { kind: 'ownership', paramId: 'id' };

    expect(pub.kind).toBe('public');
    expect(auth.kind).toBe('authenticated');
    expect(role).toEqual({ kind: 'role', role: 'ADMIN' });
    expect(owned).toEqual({ kind: 'ownership', paramId: 'id' });
  });

  it('RouteProtectionContract has path, method, access', () => {
    const contract: RouteProtectionContract = {
      path: '/api/auth/me',
      method: 'GET',
      access: { kind: 'authenticated' },
    };

    expect(contract.path).toBe('/api/auth/me');
    expect(contract.access.kind).toBe('authenticated');
  });
});
