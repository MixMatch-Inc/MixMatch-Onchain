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
});
