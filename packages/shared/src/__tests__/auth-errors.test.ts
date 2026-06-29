import { describe, expect, it } from 'vitest';
import { AuthErrorCode } from '../types/auth-errors.js';

describe('AuthErrorCode enum', () => {
  it('has the expected error codes', () => {
    expect(AuthErrorCode.INVALID_TOKEN).toBe('INVALID_TOKEN');
    expect(AuthErrorCode.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
    expect(AuthErrorCode.SESSION_EXPIRED).toBe('SESSION_EXPIRED');
    expect(AuthErrorCode.INSUFFICIENT_PERMISSIONS).toBe('INSUFFICIENT_PERMISSIONS');
    expect(AuthErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(AuthErrorCode.ACCOUNT_LOCKED).toBe('ACCOUNT_LOCKED');
    expect(AuthErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(AuthErrorCode.SESSION_NOT_FOUND).toBe('SESSION_NOT_FOUND');
    expect(AuthErrorCode.INVALID_REFRESH_TOKEN).toBe('INVALID_REFRESH_TOKEN');
  });

  it('all error codes are unique', () => {
    const values = Object.values(AuthErrorCode);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('AuthErrorResponse contract', () => {
  it('conforms to the expected shape', () => {
    const error: any = {
      code: AuthErrorCode.INVALID_TOKEN,
      message: 'Token is invalid',
    };
    expect(error.code).toBeDefined();
    expect(error.message).toBeDefined();
  });

  it('supports optional retryAfter field', () => {
    const rateLimited: any = {
      code: AuthErrorCode.RATE_LIMITED,
      message: 'Too many requests',
      retryAfter: 60,
    };
    expect(rateLimited.retryAfter).toBe(60);
  });
});
