import { describe, expect, it } from 'vitest';
import { refreshTokenSchema, updateProfileSchema } from '../validation/session.schema.js';

describe('refreshTokenSchema', () => {
  it('accepts a valid refresh token string', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: 'uuid-like-value' });

    expect(result.success).toBe(true);
  });

  it('rejects an empty refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('Refresh token is required');
  });

  it('rejects a missing refresh token', () => {
    const result = refreshTokenSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('rejects a null refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: null });

    expect(result.success).toBe(false);
  });

  it('rejects a non-string refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: 123 });

    expect(result.success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('accepts an email only', () => {
    const result = updateProfileSchema.safeParse({ email: 'new@example.com' });

    expect(result.success).toBe(true);
  });

  it('accepts a name only', () => {
    const result = updateProfileSchema.safeParse({ name: 'New Name' });

    expect(result.success).toBe(true);
  });

  it('accepts both email and name', () => {
    const result = updateProfileSchema.safeParse({
      email: 'new@example.com',
      name: 'New Name',
    });

    expect(result.success).toBe(true);
  });

  it('accepts an empty object', () => {
    const result = updateProfileSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = updateProfileSchema.safeParse({ email: 'not-an-email' });

    expect(result.success).toBe(false);
  });

  it('rejects a name that is too long', () => {
    const result = updateProfileSchema.safeParse({ name: 'a'.repeat(101) });

    expect(result.success).toBe(false);
  });

  it('rejects an empty name', () => {
    const result = updateProfileSchema.safeParse({ name: '' });

    expect(result.success).toBe(false);
  });

  it('rejects a null email', () => {
    const result = updateProfileSchema.safeParse({ email: null });

    expect(result.success).toBe(false);
  });
});

describe('refreshTokenSchema — regression coverage', () => {
  it('accepts a long UUID-style token', () => {
    const result = refreshTokenSchema.safeParse({
      refreshToken: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a token exceeding max length', () => {
    const result = refreshTokenSchema.safeParse({
      refreshToken: 'x'.repeat(1025),
    });

    expect(result.success).toBe(false);
  });

  it('accepts a token at exactly max length', () => {
    const result = refreshTokenSchema.safeParse({
      refreshToken: 'x'.repeat(1024),
    });

    expect(result.success).toBe(true);
  });

  it('rejects undefined refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: undefined });

    expect(result.success).toBe(false);
  });

  it('rejects a boolean refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: true });

    expect(result.success).toBe(false);
  });

  it('rejects an array refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: ['token'] });

    expect(result.success).toBe(false);
  });
});

describe('updateProfileSchema — regression coverage', () => {
  it('accepts a name at exactly 100 characters', () => {
    const result = updateProfileSchema.safeParse({ name: 'a'.repeat(100) });

    expect(result.success).toBe(true);
  });

  it('rejects extra fields (strict mode)', () => {
    const result = updateProfileSchema.safeParse({
      email: 'user@example.com',
      name: 'Valid Name',
      avatar: 'http://example.com/avatar.png',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty string email', () => {
    const result = updateProfileSchema.safeParse({ email: '' });

    expect(result.success).toBe(false);
  });

  it('accepts valid email with subdomain', () => {
    const result = updateProfileSchema.safeParse({ email: 'user@mail.example.com' });

    expect(result.success).toBe(true);
  });

  it('rejects email with spaces', () => {
    const result = updateProfileSchema.safeParse({ email: 'user @example.com' });

    expect(result.success).toBe(false);
  });
});
