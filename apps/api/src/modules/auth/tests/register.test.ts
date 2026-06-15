import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';

describe('POST /api/auth/register', () => {
  it('registers a new user and returns an access token', async () => {
    const app = createTestApp();

    const response = await request(app).post('/api/auth/register').send({
      email: 'new-user@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('new-user@example.com');
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects registration with an email that is already in use', async () => {
    const app = createTestApp();
    const payload = { email: 'duplicate@example.com', password: 'password123' };

    await request(app).post('/api/auth/register').send(payload);
    const response = await request(app).post('/api/auth/register').send(payload);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('rejects registration with invalid input', async () => {
    const app = createTestApp();

    const response = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
