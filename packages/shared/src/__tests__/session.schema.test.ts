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
