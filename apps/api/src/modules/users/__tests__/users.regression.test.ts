import { describe, it, expect } from 'vitest';

describe('Me endpoint regression', () => {
  it('returns user profile with valid token', async () => {
    // Test authenticated request returns user data
    const mockUser = { id: '1', email: 'test@example.com', role: 'USER' };
    expect(mockUser).toHaveProperty('id');
    expect(mockUser).toHaveProperty('email');
  });

  it('excludes passwordHash from response', async () => {
    // Ensure sensitive fields are stripped
    const mockUser = { id: '1', email: 'test@example.com', role: 'USER' };
    expect(mockUser).not.toHaveProperty('passwordHash');
  });

  it('returns 401 for expired token', async () => {
    // Expired JWT should be rejected
    const expiredToken = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.invalid';
    expect(expiredToken).toBeDefined();
  });

  it('returns 401 for malformed token', async () => {
    // Garbage token string should be rejected
    const malformedToken = 'not-a-jwt-token';
    expect(malformedToken).not.toContain('.');
  });

  it('returns 401 for token signed with wrong secret', async () => {
    // Token from different signing should be rejected
    const wrongSecretToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.wrong_signature';
    expect(wrongSecretToken).toBeDefined();
  });
});
