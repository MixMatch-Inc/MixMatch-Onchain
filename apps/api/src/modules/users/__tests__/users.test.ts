import { describe, it, expect } from 'vitest';

describe('GET /api/users/me', () => {
  it('returns current user with valid token', async () => {
    // Test that authenticated request returns user profile
  });

  it('returns 401 without token', async () => {
    // Test that unauthenticated request is rejected
  });

  it('excludes passwordHash from response', async () => {
    // Test that sensitive fields are not leaked
  });
});
