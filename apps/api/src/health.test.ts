import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp, getDetailedHealth } from './app.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns application/json content-type', async () => {
    const app = createApp();
    const response = await request(app).get('/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('returns status field in response body', async () => {
    const app = createApp();
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('status');
    expect(typeof response.body.status).toBe('string');
  });

  it('rejects POST requests', async () => {
    const app = createApp();
    const response = await request(app).post('/health');
    expect(response.status).toBe(404);
  });

  it('rejects PUT requests', async () => {
    const app = createApp();
    const response = await request(app).put('/health');
    expect(response.status).toBe(404);
  });

  it('rejects DELETE requests', async () => {
    const app = createApp();
    const response = await request(app).delete('/health');
    expect(response.status).toBe(404);
  });

  it('handles HEAD requests via GET handler', async () => {
    const app = createApp();
    const response = await request(app).head('/health');
    expect(response.status).toBe(200);
  });

  it('returns consistent response across multiple rapid requests', async () => {
    const app = createApp();
    const requests = Array.from({ length: 10 }, () =>
      request(app).get('/health'),
    );
    const responses = await Promise.all(requests);
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    }
  });

  it('handles concurrent requests without race conditions', async () => {
    const app = createApp();
    const responses = await Promise.all([
      request(app).get('/health'),
      request(app).get('/health'),
      request(app).get('/health'),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    }
  });

  it('includes CORS headers', async () => {
    const app = createApp();
    const response = await request(app).get('/health');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('responds within acceptable time', async () => {
    const app = createApp();
    const start = Date.now();
    await request(app).get('/health');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('GET /health/detailed', () => {
  it('returns 200 with components when db is reachable', async () => {
    const app = createApp();
    const response = await request(app).get('/health/detailed');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.components).toBeDefined();
    expect(response.body.components.database).toBeDefined();
    expect(response.body.components.database.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  it('returns component latency', async () => {
    const app = createApp();
    const response = await request(app).get('/health/detailed');
    expect(typeof response.body.components.database.latencyMs).toBe('number');
  });

  it('returns ISO timestamp', async () => {
    const app = createApp();
    const response = await request(app).get('/health/detailed');
    expect(new Date(response.body.timestamp as string).toISOString()).toBe(response.body.timestamp);
  });
});

describe('getDetailedHealth', () => {
  it('returns ok status structure', async () => {
    const result = await getDetailedHealth();
    expect(result.status).toBe('ok');
    expect(result.components).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });
});
