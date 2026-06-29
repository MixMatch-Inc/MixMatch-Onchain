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
