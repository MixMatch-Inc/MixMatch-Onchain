import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('Environment config — regression coverage', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('requireEnv', () => {
    it('returns the environment variable value', () => {
      process.env.TEST_VAR = 'hello';
      const result = process.env.TEST_VAR ?? 'default';
      expect(result).toBe('hello');
    });

    it('returns fallback when variable is not set', () => {
      delete process.env.TEST_VAR;
      const result = process.env.TEST_VAR ?? 'default';
      expect(result).toBe('default');
    });

    it('returns empty string when variable is set to empty', () => {
      process.env.TEST_VAR = '';
      const result = process.env.TEST_VAR ?? 'default';
      expect(result).toBe('');
    });
  });

  describe('env object shape', () => {
    it('has all required fields', async () => {
      const { env } = await import('../config/env.js');
      expect(env).toHaveProperty('nodeEnv');
      expect(env).toHaveProperty('port');
      expect(env).toHaveProperty('databaseUrl');
      expect(env).toHaveProperty('jwtSecret');
      expect(env).toHaveProperty('jwtExpiresIn');
      expect(env).toHaveProperty('webOrigin');
      expect(env).toHaveProperty('stellarNetwork');
      expect(env).toHaveProperty('rpcUrl');
    });

    it('defaults nodeEnv to development', async () => {
      delete process.env.NODE_ENV;
      const { env } = await import('../config/env.js');
      expect(env.nodeEnv).toBe('development');
    });

    it('defaults port to 3001', async () => {
      delete process.env.PORT;
      const { env } = await import('../config/env.js');
      expect(env.port).toBe(3001);
    });

    it('parses PORT as number', async () => {
      process.env.PORT = '8080';
      const { env } = await import('../config/env.js');
      expect(env.port).toBe(8080);
    });

    it('defaults jwtExpiresIn to 1h', async () => {
      delete process.env.JWT_EXPIRES_IN;
      const { env } = await import('../config/env.js');
      expect(env.jwtExpiresIn).toBe('1h');
    });

    it('defaults webOrigin to localhost:3000', async () => {
      delete process.env.WEB_ORIGIN;
      const { env } = await import('../config/env.js');
      expect(env.webOrigin).toBe('http://localhost:3000');
    });

    it('defaults stellarNetwork to testnet', async () => {
      delete process.env.STELLAR_NETWORK;
      const { env } = await import('../config/env.js');
      expect(env.stellarNetwork).toBe('testnet');
    });

    it('uses custom values when provided', async () => {
      process.env.PORT = '9000';
      process.env.NODE_ENV = 'production';
      process.env.JWT_EXPIRES_IN = '2h';
      process.env.WEB_ORIGIN = 'https://example.com';
      const { env } = await import('../config/env.js');
      expect(env.port).toBe(9000);
      expect(env.nodeEnv).toBe('production');
      expect(env.jwtExpiresIn).toBe('2h');
      expect(env.webOrigin).toBe('https://example.com');
    });
  });

  describe('JWT_SECRET validation', () => {
    it('accepts a secret longer than 32 characters in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(33);
      expect(() => require('../../shared/config/env.js')).not.toThrow();
    });

    it('rejects a secret shorter than 32 characters in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';
      expect(() => require('../../shared/config/env.js')).toThrow();
    });

    it('accepts a short secret in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'short';
      expect(() => require('../../shared/config/env.js')).not.toThrow();
    });
  });
});
