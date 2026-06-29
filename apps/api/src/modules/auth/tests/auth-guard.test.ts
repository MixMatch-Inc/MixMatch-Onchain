import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

describe('Auth guard — role-based access & ownership (#514)', () => {
  describe('requireRole', () => {
    it('allows access when the user has the required role', async () => {
      const app = createTestApp();
      const credentials = { email: 'admin-user@example.com', password: 'password123' };
      const registerRes = await request(app).post('/api/auth/register').send(credentials);
      const token = jwt.sign(
        { sub: registerRes.body.user.id, role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .get('/api/auth/admin')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('rejects access with 403 when the user role is insufficient', async () => {
      const app = createTestApp();
      const credentials = { email: 'regular-user@example.com', password: 'password123' };
      const registerRes = await request(app).post('/api/auth/register').send(credentials);
      const { accessToken } = registerRes.body;

      const res = await request(app)
        .get('/api/auth/admin')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('allowOwnership', () => {
    it('passes when the user accesses their own resource', async () => {
      const app = createTestApp();
      const credentials = { email: 'owner@example.com', password: 'password123' };
      const registerRes = await request(app).post('/api/auth/register').send(credentials);
      const { accessToken, user } = registerRes.body;

      const res = await request(app)
        .put(`/api/auth/profile/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'owner-updated@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('owner-updated@example.com');
    });

    it('rejects with 403 when the user tries to access another user resource', async () => {
      const app = createTestApp();
      const userA = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user-a@example.com', password: 'password123' });
      const userB = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user-b@example.com', password: 'password123' });

      const res = await request(app)
        .put(`/api/auth/profile/${userB.body.user.id}`)
        .set('Authorization', `Bearer ${userA.body.accessToken}`)
        .send({ email: 'hacker@example.com' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('rejects with 400 when params.id is missing', async () => {
      const app = createTestApp();
      const credentials = { email: 'missing-params@example.com', password: 'password123' };
      const registerRes = await request(app).post('/api/auth/register').send(credentials);
      const { accessToken } = registerRes.body;

      const res = await request(app)
        .get('/api/auth/ownership-test')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });
  });
});
