import jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorMiddleware } from '../../../shared/middleware/error.middleware.js';
import {
  ForbiddenError,
  RateLimitedError,
  AccountLockedError,
  SessionNotFoundError,
  InvalidRefreshTokenError,
} from '../../../shared/errors/AuthErrors.js';
import { createTestApp } from './test-app.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-abcdefghijklmnopqrstuvwxyz123';

function createErrorTestApp() {
  const app = express();
  app.use(express.json());

  app.get('/test/forbidden', () => {
    throw new ForbiddenError();
  });
  app.get('/test/rate-limited', () => {
    throw new RateLimitedError();
  });
  app.get('/test/account-locked', () => {
    throw new AccountLockedError();
  });
  app.get('/test/session-not-found', () => {
    throw new SessionNotFoundError();
  });
  app.get('/test/invalid-refresh-token', () => {
    throw new InvalidRefreshTokenError();
  });
  app.get('/test/unhandled', () => {
    throw new Error('Something unexpected');
  });

  app.use(errorMiddleware);
  return app;
}

describe('Auth error handling (#520)', () => {
  describe('Consistent error format', () => {
    it('all auth errors return { error: { code, message } }', async () => {
      const errorApp = createErrorTestApp();

      const responses = await Promise.all([
        request(errorApp).get('/test/forbidden'),
        request(errorApp).get('/test/rate-limited'),
        request(errorApp).get('/test/account-locked'),
        request(errorApp).get('/test/session-not-found'),
        request(errorApp).get('/test/invalid-refresh-token'),
        request(errorApp).get('/test/unhandled'),
      ]);

      for (const response of responses) {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('code');
        expect(response.body.error).toHaveProperty('message');
      }
    });
  });

  describe('Expired token', () => {
    it('returns 401 with TOKEN_EXPIRED code for expired token', async () => {
      const app = createTestApp();
      const token = jwt.sign({ sub: 'user-id' }, JWT_SECRET, { expiresIn: -1 });
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
      expect(response.body.error.message).toBe('Token has expired');
    });
  });

  describe('Invalid token format', () => {
    it('returns 401 with INVALID_TOKEN code for malformed Authorization header', async () => {
      const app = createTestApp();
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'NotBearer something');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
      expect(response.body.error.message).toBe('Missing or invalid Authorization header');
    });

    it('returns 401 with INVALID_TOKEN code for an invalid token string', async () => {
      const app = createTestApp();
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer this.is.not.a.valid.token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Insufficient permissions', () => {
    it('returns 403 with FORBIDDEN code', async () => {
      const app = createErrorTestApp();
      const response = await request(app).get('/test/forbidden');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 with RATE_LIMITED code', async () => {
      const app = createErrorTestApp();
      const response = await request(app).get('/test/rate-limited');

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMITED');
      expect(response.body.error.message).toBe('Too many requests');
    });
  });

  describe('Account locked', () => {
    it('returns 423 with ACCOUNT_LOCKED code', async () => {
      const app = createErrorTestApp();
      const response = await request(app).get('/test/account-locked');

      expect(response.status).toBe(423);
      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('Session not found', () => {
    it('returns 404 with SESSION_NOT_FOUND code', async () => {
      const app = createErrorTestApp();
      const response = await request(app).get('/test/session-not-found');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('Invalid refresh token', () => {
    it('returns 401 with INVALID_REFRESH_TOKEN code', async () => {
      const app = createErrorTestApp();
      const response = await request(app).get('/test/invalid-refresh-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('Unhandled errors', () => {
    it('returns 500 with INTERNAL_SERVER_ERROR code', async () => {
      const app = createErrorTestApp();
      const response = await request(app).get('/test/unhandled');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
