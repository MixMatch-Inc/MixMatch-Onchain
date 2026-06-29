import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and returns an access token', async () => {
    const app = createTestApp();
    const credentials = { email: 'login-user@example.com', password: 'password123' };

    await request(app).post('/api/auth/register').send(credentials);
    const response = await request(app).post('/api/auth/login').send(credentials);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(credentials.email);
    expect(typeof response.body.accessToken).toBe('string');
  });

  it('rejects login with an invalid password', async () => {
    const app = createTestApp();
    const email = 'wrong-password@example.com';

    await request(app).post('/api/auth/register').send({ email, password: 'password123' });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'incorrect-password' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects login for a non-existent account', async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
