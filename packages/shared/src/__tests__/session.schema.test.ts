import { describe, expect, it } from 'vitest';
import { refreshTokenSchema, updateProfileSchema } from '../validation/session.schema.js';

describe('refreshTokenSchema', () => {
  it('accepts a valid refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: 'abc-123' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty refresh token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing refresh token', () => {
    const result = refreshTokenSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('accepts a valid email update', () => {
    const result = updateProfileSchema.safeParse({ email: 'new@example.com' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid name update', () => {
    const result = updateProfileSchema.safeParse({ name: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('accepts an empty body (partial update)', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = updateProfileSchema.safeParse({ email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a name that is too long', () => {
    const result = updateProfileSchema.safeParse({ name: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });
});
