import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../validation/auth.schema.js';

describe('registerSchema', () => {
  it('accepts a valid email and password', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a password at exactly 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: '12345678',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a password at exactly 128 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'x'.repeat(128),
    });

    expect(result.success).toBe(true);
  });

  it('rejects a password longer than 128 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'x'.repeat(129),
    });

    expect(result.success).toBe(false);
  });

  it('accepts a password with unicode characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'pässwörd🔑123',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a password with special characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'P@ssw0rd!#$%&*()',
    });

    expect(result.success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('accepts a valid email and non-empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anything',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a single-character password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'a',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a password at exactly 128 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'x'.repeat(128),
    });

    expect(result.success).toBe(true);
  });

  it('rejects a password longer than 128 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'x'.repeat(129),
    });

    expect(result.success).toBe(false);
  });

  it('accepts a password with only whitespace', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '   ',
    });

    expect(result.success).toBe(true);
  });
});

describe('registerSchema — regression coverage', () => {
  it('rejects extra fields (strict mode)', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      extraField: 'should not be here',
    });

    expect(result.success).toBe(false);
  });

  it('normalizes email to lowercase', () => {
    const result = registerSchema.safeParse({
      email: 'USER@EXAMPLE.COM',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('trims whitespace from email', () => {
    const result = registerSchema.safeParse({
      email: '  user@example.com  ',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('rejects email with no domain', () => {
    const result = registerSchema.safeParse({
      email: 'user@',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects email with no local part', () => {
    const result = registerSchema.safeParse({
      email: '@example.com',
      password: 'password123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects completely empty object', () => {
    const result = registerSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = registerSchema.safeParse(null);

    expect(result.success).toBe(false);
  });

  it('accepts password at boundary of 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: '12345678',
    });

    expect(result.success).toBe(true);
  });

  it('rejects password at 7 characters', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: '1234567',
    });

    expect(result.success).toBe(false);
  });
});

describe('loginSchema — regression coverage', () => {
  it('rejects extra fields (strict mode)', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      rememberMe: true,
    });

    expect(result.success).toBe(false);
  });

  it('normalizes email to lowercase', () => {
    const result = loginSchema.safeParse({
      email: 'USER@EXAMPLE.COM',
      password: 'password123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('rejects completely empty object', () => {
    const result = loginSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('rejects null input', () => {
    const result = loginSchema.safeParse(null);

    expect(result.success).toBe(false);
  });
});
