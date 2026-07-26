import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-abcdefghijklmnopqrstuvwxyz123';

describe('GET /api/auth/me — route protection (#610)', () => {
  it('returns 401 with no Authorization header', async () => {
    const app = createTestApp();
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 with a malformed Authorization header', async () => {
    const app = createTestApp();
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'NotBearer abc');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 with an invalid token', async () => {
    const app = createTestApp();
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.valid.token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 with an expired token', async () => {
    const app = createTestApp();
    const token = jwt.sign({ sub: 'user-id' }, JWT_SECRET, { expiresIn: -1 });
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('returns 200 with user data for a valid token', async () => {
    const app = createTestApp();
    const credentials = { email: 'me-user@example.com', password: 'password123' };

    const registerRes = await request(app).post('/api/auth/register').send(credentials);
    const { accessToken } = registerRes.body;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(credentials.email);
    expect(meRes.body.user.passwordHash).toBeUndefined();
  });

  it('returns 404 for a valid token referencing a non-existent user', async () => {
    const app = createTestApp();
    const token = jwt.sign({ sub: '00000000-0000-0000-0000-000000000000' }, JWT_SECRET);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(404);
    expect(meRes.body.error.code).toBe('NOT_FOUND');
  });
});
