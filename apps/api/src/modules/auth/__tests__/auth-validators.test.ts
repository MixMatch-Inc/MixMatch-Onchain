import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema, refreshTokenSchema } from '@mixmatch/shared';
import { parseRegisterInput, parseLoginInput, parseRefreshInput } from '../auth.validators.js';
import { ValidationError } from '../../../shared/errors/AppError.js';

describe('auth validators', () => {
  describe('registerSchema', () => {
    it('accepts a valid email and password', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('normalizes email to lowercase and trims', () => {
      const result = registerSchema.safeParse({ email: '  User@EXAMPLE.com  ', password: 'password123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('rejects empty email', () => {
      const result = registerSchema.safeParse({ email: '', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = registerSchema.safeParse({ email: 'not-an-email', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects email exceeding max length', () => {
      const longLocal = 'a'.repeat(255);
      const result = registerSchema.safeParse({ email: `${longLocal}@example.com`, password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects missing email', () => {
      const result = registerSchema.safeParse({ password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com' });
      expect(result.success).toBe(false);
    });

    it('rejects password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: 'short' });
      expect(result.success).toBe(false);
    });

    it('rejects password longer than 128 characters', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: 'a'.repeat(129) });
      expect(result.success).toBe(false);
    });

    it('accepts password at exact boundary 8 characters', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: '12345678' });
      expect(result.success).toBe(true);
    });

    it('accepts password at exact boundary 128 characters', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: 'a'.repeat(128) });
      expect(result.success).toBe(true);
    });

    it('rejects non-object input', () => {
      const result = registerSchema.safeParse('not-an-object');
      expect(result.success).toBe(false);
    });

    it('rejects null', () => {
      const result = registerSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('rejects array input', () => {
      const result = registerSchema.safeParse([]);
      expect(result.success).toBe(false);
    });

    it('rejects extra fields', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        extra: 'field',
      });
      expect(result.success).toBe(false);
    });

    it('rejects numeric email', () => {
      const result = registerSchema.safeParse({ email: 42, password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects numeric password', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: 42 });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts a valid email and password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('accepts a short password on login', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'a' });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({ email: 'bad', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
      expect(loginSchema.safeParse({}).success).toBe(false);
      expect(loginSchema.safeParse({ email: 'user@example.com' }).success).toBe(false);
      expect(loginSchema.safeParse({ password: 'pass' }).success).toBe(false);
    });

    it('rejects extra fields', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password',
        name: 'oops',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenSchema', () => {
    it('accepts a valid refresh token', () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: 'some-token-value' });
      expect(result.success).toBe(true);
    });

    it('rejects empty refreshToken', () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: '' });
      expect(result.success).toBe(false);
    });

    it('rejects missing refreshToken', () => {
      const result = refreshTokenSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects non-string refreshToken', () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: 123 });
      expect(result.success).toBe(false);
    });

    it('rejects extra fields', () => {
      const result = refreshTokenSchema.safeParse({ refreshToken: 'token', extra: true });
      expect(result.success).toBe(false);
    });
  });

  describe('parseRegisterInput', () => {
    it('returns parsed data on success', () => {
      const data = parseRegisterInput({ email: 'user@example.com', password: 'password123' });
      expect(data.email).toBe('user@example.com');
      expect(data.password).toBe('password123');
    });

    it('throws ValidationError on invalid input', () => {
      expect(() => parseRegisterInput({ email: 'bad' })).toThrow(ValidationError);
    });

    it('throws ValidationError on null input', () => {
      expect(() => parseRegisterInput(null)).toThrow(ValidationError);
    });
  });

  describe('parseLoginInput', () => {
    it('returns parsed data on success', () => {
      const data = parseLoginInput({ email: 'user@example.com', password: 'pass' });
      expect(data.email).toBe('user@example.com');
    });

    it('throws ValidationError on invalid input', () => {
      expect(() => parseLoginInput({ email: 'bad' })).toThrow(ValidationError);
    });
  });

  describe('parseRefreshInput', () => {
    it('returns refresh token object on success', () => {
      const data = parseRefreshInput({ refreshToken: 'valid-token' });
      expect(data.refreshToken).toBe('valid-token');
    });

    it('throws ValidationError when refreshToken is missing', () => {
      expect(() => parseRefreshInput({})).toThrow(ValidationError);
    });

    it('throws ValidationError when refreshToken is empty string', () => {
      expect(() => parseRefreshInput({ refreshToken: '' })).toThrow(ValidationError);
    });

    it('throws ValidationError when input is null', () => {
      expect(() => parseRefreshInput(null)).toThrow(ValidationError);
    });

    it('throws ValidationError when input is a string', () => {
      expect(() => parseRefreshInput('string')).toThrow(ValidationError);
    });
  });

  describe('edge cases', () => {
    it('accepts email with subdomains', () => {
      const result = registerSchema.safeParse({ email: 'user@sub.domain.example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('accepts email with plus addressing', () => {
      const result = registerSchema.safeParse({ email: 'user+tag@example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('accepts email with dots in local part', () => {
      const result = registerSchema.safeParse({ email: 'first.last@example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('accepts unicode in password', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: 'pässwörd123' });
      expect(result.success).toBe(true);
    });

    it('accepts password with spaces', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: 'pass word123' });
      expect(result.success).toBe(true);
    });

    it('accepts password with special characters', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: 'p@$$w0rd!#' });
      expect(result.success).toBe(true);
    });
  });
});
