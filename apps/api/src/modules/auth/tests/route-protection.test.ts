import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-abcdefghijklmnopqrstuvwxyz123';

describe('Route protection — regression coverage', () => {
  describe('public routes', () => {
    it('register does not require authentication', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'public@test.com', password: 'password123' });

      expect(res.status).toBe(201);
    });

    it('login does not require authentication', async () => {
      const app = createTestApp();
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login-test@test.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login-test@test.com', password: 'password123' });

      expect(res.status).toBe(200);
    });
  });

  describe('authenticated routes', () => {
    it('rejects request without Authorization header', async () => {
      const app = createTestApp();
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects request with malformed Authorization header', async () => {
      const app = createTestApp();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'NotBearer token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects request with empty Bearer token', async () => {
      const app = createTestApp();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
    });

    it('rejects request with expired token', async () => {
      const app = createTestApp();
      const expiredToken = jwt.sign(
        { sub: 'user-1', role: 'USER' },
        JWT_SECRET,
        { expiresIn: '-1h' },
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('rejects request with token signed by wrong secret', async () => {
      const app = createTestApp();
      const wrongSecretToken = jwt.sign(
        { sub: 'user-1', role: 'USER' },
        'completely-wrong-secret-key-1234567890',
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('allows request with valid token', async () => {
      const app = createTestApp();
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'valid@test.com', password: 'password123' });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registerRes.body.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('valid@test.com');
    });
  });

  describe('role-based routes', () => {
    it('rejects USER role on ADMIN route', async () => {
      const app = createTestApp();
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user-role@test.com', password: 'password123' });

      const res = await request(app)
        .get('/api/auth/admin')
        .set('Authorization', `Bearer ${registerRes.body.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('allows ADMIN role on ADMIN route', async () => {
      const app = createTestApp();
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'admin-role@test.com', password: 'password123' });

      const adminToken = jwt.sign(
        { sub: registerRes.body.user.id, role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .get('/api/auth/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('rejects expired token on ADMIN route', async () => {
      const app = createTestApp();
      const expiredAdminToken = jwt.sign(
        { sub: 'admin-1', role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '-1h' },
      );

      const res = await request(app)
        .get('/api/auth/admin')
        .set('Authorization', `Bearer ${expiredAdminToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('ownership-based routes', () => {
    it('allows user to update their own profile', async () => {
      const app = createTestApp();
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'owner@test.com', password: 'password123' });

      const res = await request(app)
        .put(`/api/auth/profile/${registerRes.body.user.id}`)
        .set('Authorization', `Bearer ${registerRes.body.accessToken}`)
        .send({ email: 'updated@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('updated@test.com');
    });

    it('rejects cross-user profile update', async () => {
      const app = createTestApp();
      const userA = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user-a@test.com', password: 'password123' });
      const userB = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user-b@test.com', password: 'password123' });

      const res = await request(app)
        .put(`/api/auth/profile/${userB.body.user.id}`)
        .set('Authorization', `Bearer ${userA.body.accessToken}`)
        .send({ email: 'hacked@test.com' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('rejects ownership check when params.id is missing', async () => {
      const app = createTestApp();
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'no-params@test.com', password: 'password123' });

      const res = await request(app)
        .get('/api/auth/ownership-test')
        .set('Authorization', `Bearer ${registerRes.body.accessToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('error response consistency', () => {
    it('returns consistent error shape for all 401 responses', async () => {
      const app = createTestApp();
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(typeof res.body.error.code).toBe('string');
      expect(typeof res.body.error.message).toBe('string');
    });

    it('returns consistent error shape for all 403 responses', async () => {
      const app = createTestApp();
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'error-shape@test.com', password: 'password123' });

      const res = await request(app)
        .get('/api/auth/admin')
        .set('Authorization', `Bearer ${registerRes.body.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
    });
  });
});
