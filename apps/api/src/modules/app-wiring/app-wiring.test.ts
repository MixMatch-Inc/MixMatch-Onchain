import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';

describe('App wiring (#575)', () => {
  it('creates an Express app instance', () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });

  it('mounts the health route', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
  });

  it('mounts the auth register route', async () => {
    const app = createApp();
    // Sending invalid body — should return 400 not 404, confirming the route is wired
    const response = await request(app).post('/api/auth/register').send({});

    expect(response.status).toBe(400);
  });

  it('mounts the auth login route', async () => {
    const app = createApp();
    const response = await request(app).post('/api/auth/login').send({});

    expect(response.status).toBe(400);
  });

  it('mounts the auth /me route', async () => {
    const app = createApp();
    // No token — should return 401 not 404, confirming the route is wired
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
  });

  it('returns JSON error for unhandled routes', async () => {
    const app = createApp();
    const response = await request(app).get('/api/nonexistent');

    expect(response.status).toBe(404);
  });
});
