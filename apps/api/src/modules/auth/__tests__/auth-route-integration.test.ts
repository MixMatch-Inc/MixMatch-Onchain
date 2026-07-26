import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../tests/test-app.js';

describe('auth route integration', () => {
  describe('POST /api/auth/register validation wiring', () => {
    it('returns VALIDATION_ERROR for invalid email', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-valid', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns VALIDATION_ERROR for short password', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns VALIDATION_ERROR for empty body', async () => {
      const app = createTestApp();
      const res = await request(app).post('/api/auth/register').send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns VALIDATION_ERROR for extra fields', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'password123', role: 'ADMIN' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('successfully registers with valid input', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'valid@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('valid@example.com');
    });
  });

  describe('POST /api/auth/login validation wiring', () => {
    it('returns VALIDATION_ERROR for invalid email', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns VALIDATION_ERROR for empty password', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns VALIDATION_ERROR for empty body', async () => {
      const app = createTestApp();
      const res = await request(app).post('/api/auth/login').send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/refresh validation wiring', () => {
    it('returns error for empty body', async () => {
      const app = createTestApp();
      const res = await request(app).post('/api/auth/refresh').send({});

      expect(res.status).toBe(400);
    });

    it('returns error for missing refreshToken', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ token: 'some-token' });

      expect(res.status).toBe(400);
    });
  });
});
