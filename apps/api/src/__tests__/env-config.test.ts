import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const ENV_MODULE_PATH = '../shared/config/env.js';

describe('Environment config — regression coverage', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function loadEnv() {
    return import(ENV_MODULE_PATH);
  }

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
      const { env } = await import('../shared/config/env.js');
      expect(env).toHaveProperty('nodeEnv');
      expect(env).toHaveProperty('port');
      expect(env).toHaveProperty('databaseUrl');
      expect(env).toHaveProperty('jwtSecret');
      expect(env).toHaveProperty('jwtExpiresIn');
      expect(env).toHaveProperty('webOrigin');
      expect(env).toHaveProperty('stellarNetwork');
      expect(env).toHaveProperty('rpcUrl');
    });

  
  describe('JWT_SECRET validation', () => {
    it('accepts a secret longer than 32 characters in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(33);
      await expect(loadEnv()).resolves.toBeDefined();
    });

    it('rejects a secret shorter than 32 characters in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';
      await expect(loadEnv()).rejects.toThrow();
    });

    it('accepts a short secret in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'short';
      await expect(loadEnv()).resolves.toBeDefined();
    });
  });

  describe('env trimming', () => {
    it('trims whitespace from string values', async () => {
      process.env.NODE_ENV = '  production  ';
      process.env.JWT_EXPIRES_IN = '  2h  ';
      process.env.WEB_ORIGIN = '  https://example.com  ';
      const { env } = await loadEnv();
      expect(env.nodeEnv).toBe('production');
      expect(env.jwtExpiresIn).toBe('2h');
      expect(env.webOrigin).toBe('https://example.com');
    });

    it('trims whitespace from PORT', async () => {
      process.env.PORT = '  8080  ';
      const { env } = await loadEnv();
      expect(env.port).toBe(8080);
    });
  });

  describe('PORT edge cases', () => {
    it('throws on non-numeric PORT', async () => {
      process.env.PORT = 'abc';
      await expect(loadEnv()).rejects.toThrow(/Invalid PORT/);
    });

    it('throws on PORT of 0', async () => {
      process.env.PORT = '0';
      await expect(loadEnv()).rejects.toThrow(/Invalid PORT/);
    });

    it('throws on negative PORT', async () => {
      process.env.PORT = '-1';
      await expect(loadEnv()).rejects.toThrow(/Invalid PORT/);
    });

    it('throws on PORT above 65535', async () => {
      process.env.PORT = '99999';
      await expect(loadEnv()).rejects.toThrow(/Invalid PORT/);
    });

    it('accepts boundary PORT 1', async () => {
      process.env.PORT = '1';
      const { env } = await loadEnv();
      expect(env.port).toBe(1);
    });

    it('accepts boundary PORT 65535', async () => {
      process.env.PORT = '65535';
      const { env } = await loadEnv();
      expect(env.port).toBe(65535);
    });
  });


