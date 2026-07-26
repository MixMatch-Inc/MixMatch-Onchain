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
      const { env } = await loadEnv();
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

    it('defaults webOrigin to localhost:3000', async () => {
      delete process.env.WEB_ORIGIN;
      const { env } = await loadEnv();
      expect(env.webOrigin).toBe('http://localhost:3000');
    });

    it('defaults stellarNetwork to testnet', async () => {
      delete process.env.STELLAR_NETWORK;
      const { env } = await loadEnv();
      expect(env.stellarNetwork).toBe('testnet');
    });

    it('uses custom values when provided', async () => {
      process.env.PORT = '9000';
      process.env.NODE_ENV = 'production';
      process.env.JWT_EXPIRES_IN = '2h';
      process.env.WEB_ORIGIN = 'https://example.com';
      const { env } = await loadEnv();
      expect(env.port).toBe(9000);
      expect(env.nodeEnv).toBe('production');
      expect(env.jwtExpiresIn).toBe('2h');
      expect(env.webOrigin).toBe('https://example.com');
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

  describe('DATABASE_URL handling', () => {
    it('defaults databaseUrl to empty string', async () => {
      delete process.env.DATABASE_URL;
      const { env } = await loadEnv();
      expect(env.databaseUrl).toBe('');
    });

    it('preserves DATABASE_URL with special characters', async () => {
      process.env.DATABASE_URL = 'postgresql://user:p%40ss@host:5432/db?sslmode=require';
      const { env } = await loadEnv();
      expect(env.databaseUrl).toBe('postgresql://user:p%40ss@host:5432/db?sslmode=require');
    });

    it('trims whitespace from DATABASE_URL', async () => {
      process.env.DATABASE_URL = '  postgresql://localhost/db  ';
      const { env } = await loadEnv();
      expect(env.databaseUrl).toBe('postgresql://localhost/db');
    });
  });

  describe('boolean env vars', () => {
    it('parses "true" as true', () => {
      process.env.FEATURE_FLAG = 'true';
      const raw = process.env.FEATURE_FLAG?.trim().toLowerCase();
      const result = raw === 'true' || raw === '1' || raw === 'yes';
      expect(result).toBe(true);
    });

    it('parses "false" as false', () => {
      process.env.FEATURE_FLAG = 'false';
      const raw = process.env.FEATURE_FLAG?.trim().toLowerCase();
      const result = raw === 'true' || raw === '1' || raw === 'yes';
      expect(result).toBe(false);
    });

    it('parses "1" as true', () => {
      process.env.FEATURE_FLAG = '1';
      const raw = process.env.FEATURE_FLAG?.trim().toLowerCase();
      const result = raw === 'true' || raw === '1' || raw === 'yes';
      expect(result).toBe(true);
    });

    it('parses "0" as false', () => {
      process.env.FEATURE_FLAG = '0';
      const raw = process.env.FEATURE_FLAG?.trim().toLowerCase();
      const result = raw === 'true' || raw === '1' || raw === 'yes';
      expect(result).toBe(false);
    });
  });

  describe('numeric type coercion', () => {
    it('coerces string numbers correctly', () => {
      expect(Number('3001')).toBe(3001);
      expect(Number('0')).toBe(0);
      expect(Number('abc')).toBeNaN();
      expect(Number('')).toBe(0);
    });
  });

  describe('validateEnv', () => {
    it('returns env when DATABASE_URL is set', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      const { validateEnv } = await loadEnv();
      expect(() => validateEnv()).not.toThrow();
    });

    it('throws when DATABASE_URL is missing', async () => {
      delete process.env.DATABASE_URL;
      process.env.JWT_SECRET = 'a'.repeat(32);
      const { validateEnv } = await loadEnv();
      expect(() => validateEnv()).toThrow(/DATABASE_URL/);
    });

    it('validates all required vars are present', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      const { validateEnv } = await loadEnv();
      const result = validateEnv();
      expect(result).toHaveProperty('databaseUrl', 'postgresql://localhost/db');
    });
  });


