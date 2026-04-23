import { describe, it, expect } from 'vitest';
import { apiManifest, webManifest, stellarManifest } from '../src/manifest';
import { validateServiceEnv } from '../src/validator';

describe('Environment Manifest Validation', () => {
  describe('API Service', () => {
    it('should pass with all required variables', () => {
      const env = {
        MONGO_URI: 'mongodb://localhost:27017/test',
        JWT_SECRET: 'test-secret-key',
      };

      const result = validateServiceEnv(apiManifest, env);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when required variables are missing', () => {
      const env = {};

      const result = validateServiceEnv(apiManifest, env);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('MONGO_URI');
      expect(result.missing).toContain('JWT_SECRET');
    });

    it('should fail with malformed URL', () => {
      const env = {
        MONGO_URI: 'not-a-valid-url',
        JWT_SECRET: 'test-secret',
      };

      const result = validateServiceEnv(apiManifest, env);
      expect(result.valid).toBe(false);
      expect(result.malformed).toContain('MONGO_URI');
    });

    it('should accept optional variables with defaults', () => {
      const env = {
        MONGO_URI: 'mongodb://localhost:27017/test',
        JWT_SECRET: 'test-secret',
        PORT: '3001',
        CORS_ORIGIN: 'http://localhost:3000',
      };

      const result = validateServiceEnv(apiManifest, env);
      expect(result.valid).toBe(true);
    });

    it('should fail with malformed port number', () => {
      const env = {
        MONGO_URI: 'mongodb://localhost:27017/test',
        JWT_SECRET: 'test-secret',
        PORT: 'not-a-number',
      };

      const result = validateServiceEnv(apiManifest, env);
      expect(result.valid).toBe(false);
      expect(result.malformed).toContain('PORT');
    });
  });

  describe('Web Service', () => {
    it('should pass with required variable', () => {
      const env = {
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      };

      const result = validateServiceEnv(webManifest, env);
      expect(result.valid).toBe(true);
    });

    it('should fail when NEXT_PUBLIC_API_URL is missing', () => {
      const env = {};

      const result = validateServiceEnv(webManifest, env);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('NEXT_PUBLIC_API_URL');
    });
  });

  describe('Stellar Service', () => {
    it('should pass with required variable', () => {
      const env = {
        STELLAR_SEC_KEY: 'SBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      };

      const result = validateServiceEnv(stellarManifest, env);
      expect(result.valid).toBe(true);
    });

    it('should fail when STELLAR_SEC_KEY is missing', () => {
      const env = {};

      const result = validateServiceEnv(stellarManifest, env);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('STELLAR_SEC_KEY');
    });

    it('should accept optional variables with defaults', () => {
      const env = {
        STELLAR_SEC_KEY: 'SBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        STELLAR_NETWORK: 'TESTNET',
        PORT: '3002',
      };

      const result = validateServiceEnv(stellarManifest, env);
      expect(result.valid).toBe(true);
    });
  });
});
