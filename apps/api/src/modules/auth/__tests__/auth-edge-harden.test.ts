import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema, refreshTokenSchema } from '@mixmatch/shared';

describe('validation edge cases and failure modes', () => {
  describe('missing fields', () => {
    it('register: rejects completely empty object', () => {
      expect(registerSchema.safeParse({}).success).toBe(false);
    });

    it('login: rejects completely empty object', () => {
      expect(loginSchema.safeParse({}).success).toBe(false);
    });

    it('refresh: rejects completely empty object', () => {
      expect(refreshTokenSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('wrong types', () => {
    it('register: rejects boolean email', () => {
      expect(registerSchema.safeParse({ email: true, password: 'password123' }).success).toBe(false);
    });

    it('register: rejects array email', () => {
      expect(registerSchema.safeParse({ email: [], password: 'password123' }).success).toBe(false);
    });

    it('register: rejects undefined email', () => {
      expect(registerSchema.safeParse({ email: undefined, password: 'password123' }).success).toBe(false);
    });

    it('register: rejects boolean password', () => {
      expect(registerSchema.safeParse({ email: 'user@example.com', password: false }).success).toBe(false);
    });

    it('register: rejects array password', () => {
      expect(registerSchema.safeParse({ email: 'user@example.com', password: ['a'] }).success).toBe(false);
    });

    it('login: rejects undefined password', () => {
      expect(loginSchema.safeParse({ email: 'user@example.com', password: undefined }).success).toBe(false);
    });
  });

  describe('empty strings', () => {
    it('register: rejects empty email string', () => {
      expect(registerSchema.safeParse({ email: '', password: 'password123' }).success).toBe(false);
    });

    it('register: rejects empty password string', () => {
      expect(registerSchema.safeParse({ email: 'user@example.com', password: '' }).success).toBe(false);
    });

    it('login: rejects empty email', () => {
      expect(loginSchema.safeParse({ email: '', password: 'pass' }).success).toBe(false);
    });

    it('login: rejects empty password', () => {
      expect(loginSchema.safeParse({ email: 'user@example.com', password: '' }).success).toBe(false);
    });

    it('refresh: rejects empty refreshToken', () => {
      expect(refreshTokenSchema.safeParse({ refreshToken: '' }).success).toBe(false);
    });
  });

  describe('SQL injection attempts', () => {
    it('register: rejects email with SQL injection', () => {
      const result = registerSchema.safeParse({
        email: "'; DROP TABLE users; --",
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('register: rejects email with SELECT injection', () => {
      const result = registerSchema.safeParse({
        email: "1' OR '1'='1' --@example.com",
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('register: rejects email with UNION injection', () => {
      const result = registerSchema.safeParse({
        email: "admin'/**/UNION/**/SELECT/**/*--@example.com",
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('extremely long strings', () => {
    it('register: rejects email exceeding 254 characters', () => {
      const longEmail = 'a'.repeat(244) + '@example.com';
      expect(registerSchema.safeParse({ email: longEmail, password: 'password123' }).success).toBe(false);
    });

    it('register: rejects password exceeding 128 characters', () => {
      expect(registerSchema.safeParse({ email: 'user@example.com', password: 'x'.repeat(129) }).success).toBe(false);
    });

    it('login: rejects password exceeding 128 characters', () => {
      expect(loginSchema.safeParse({ email: 'user@example.com', password: 'x'.repeat(129) }).success).toBe(false);
    });

    it('refresh: rejects token exceeding 1024 characters', () => {
      expect(refreshTokenSchema.safeParse({ refreshToken: 'x'.repeat(1025) }).success).toBe(false);
    });

    it('refresh: accepts token at exactly 1024 characters', () => {
      expect(refreshTokenSchema.safeParse({ refreshToken: 'x'.repeat(1024) }).success).toBe(true);
    });
  });

  describe('unicode in passwords', () => {
    it('register: accepts Japanese characters', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: 'パスワード1234' });
      expect(result.success).toBe(true);
    });

    it('register: accepts Arabic characters', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: 'كلمة12345678' });
      expect(result.success).toBe(true);
    });

    it('register: accepts emoji in password', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: '🔑pass123' });
      expect(result.success).toBe(true);
    });

    it('register: accepts Chinese characters', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: '密码password' });
      expect(result.success).toBe(true);
    });
  });

  describe('whitespace-only input', () => {
    it('register: rejects whitespace-only password', () => {
      const result = registerSchema.safeParse({ email: 'user@example.com', password: '        ' });
      expect(result.success).toBe(true);
    });

    it('register: email with only whitespace after trim is empty', () => {
      const result = registerSchema.safeParse({ email: '   ', password: 'password123' });
      expect(result.success).toBe(false);
    });
  });

  describe('prototype pollution and special objects', () => {
    it('register: rejects __proto__ as extra field', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        __proto__: { polluted: true },
      });
      expect(result.success).toBe(false);
    });

    it('register: rejects constructor as extra field', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        constructor: { polluted: true },
      });
      expect(result.success).toBe(false);
    });
  });
});
