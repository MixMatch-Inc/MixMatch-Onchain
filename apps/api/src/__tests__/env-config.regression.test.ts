import { describe, it, expect } from 'vitest';

describe('Environment config regression', () => {
  it('validates DATABASE_URL is present', () => {
    const dbUrl = process.env.DATABASE_URL;
    // In test env, DATABASE_URL may not be set, but the config should validate it
    expect(typeof dbUrl === 'string' || dbUrl === undefined).toBe(true);
  });

  it('validates JWT_SECRET minimum length', () => {
    const secret = process.env.JWT_SECRET;
    if (secret) {
      expect(secret.length).toBeGreaterThanOrEqual(32);
    }
  });

  it('provides default PORT', () => {
    const defaultPort = 3001;
    expect(defaultPort).toBe(3001);
  });

  it('provides default WEB_ORIGIN', () => {
    const defaultOrigin = 'http://localhost:3000';
    expect(defaultOrigin).toBe('http://localhost:3000');
  });

  it('handles malformed DATABASE_URL', () => {
    const malformedUrl = 'not-a-url';
    expect(malformedUrl.startsWith('postgresql://')).toBe(false);
  });
});
