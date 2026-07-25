import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../shared/test-harness.js';

describe('Test harness — core flow regression', () => {
  const app = createTestApp();

  it('register → login → me returns the authenticated user', async () => {
    const email = `harness-${Date.now()}@example.com`;
    const password = 'harness-test-password';

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user).toBeDefined();
    expect(registerRes.body.accessToken).toBeDefined();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(email);
  });

  it('returns 401 for /me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for /me with an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-value');
    expect(res.status).toBe(401);
  });

  it('rejects duplicate registration', async () => {
    const email = `dup-${Date.now()}@example.com`;
    const password = 'dup-test-password';

    await request(app)
      .post('/api/auth/register')
      .send({ email, password });

    const dupRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password });

    expect(dupRes.status).toBeGreaterThanOrEqual(400);
  });

  it('returns 400 for login with wrong password', async () => {
    const email = `wrongpw-${Date.now()}@example.com`;

    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'correct-password' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('admin endpoint returns 403 for non-admin users', async () => {
    const email = `nonadmin-${Date.now()}@example.com`;
    const password = 'nonadmin-password';

    await request(app)
      .post('/api/auth/register')
      .send({ email, password });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    const adminRes = await request(app)
      .get('/api/auth/admin')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(adminRes.status).toBe(403);
  });
});
