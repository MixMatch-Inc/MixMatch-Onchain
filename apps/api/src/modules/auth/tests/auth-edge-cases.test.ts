import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';

describe('Auth edge cases (#586)', () => {
  describe('Registration edge cases', () => {
    it('rejects a missing email field', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a missing password field', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an empty body', async () => {
      const app = createTestApp();
      const response = await request(app).post('/api/auth/register').send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('normalises email to lowercase on registration', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'User@Example.COM', password: 'password123' });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('user@example.com');
    });

    it('does not expose passwordHash in the response', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'nohash@example.com', password: 'password123' });

      expect(response.status).toBe(201);
      expect(response.body.user.passwordHash).toBeUndefined();
    });
  });

  describe('Login edge cases', () => {
    it('rejects login with an empty body', async () => {
      const app = createTestApp();
      const response = await request(app).post('/api/auth/login').send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects login with a missing password field', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns the same error for wrong email and wrong password (no enumeration)', async () => {
      const app = createTestApp();
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'exists@example.com', password: 'password123' });

      const [wrongEmail, wrongPassword] = await Promise.all([
        request(app)
          .post('/api/auth/login')
          .send({ email: 'no-such@example.com', password: 'password123' }),
        request(app)
          .post('/api/auth/login')
          .send({ email: 'exists@example.com', password: 'wrongpassword' }),
      ]);

      expect(wrongEmail.status).toBe(401);
      expect(wrongPassword.status).toBe(401);
      expect(wrongEmail.body.error.message).toBe(wrongPassword.body.error.message);
    });
  });
});
