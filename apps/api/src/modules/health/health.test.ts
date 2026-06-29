import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';

describe('GET /health (#545)', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('responds with JSON content-type', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('returns 404 for unknown routes', async () => {
    const app = createApp();
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
  });
});
