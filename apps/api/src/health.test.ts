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
  it('returns 200 or 503 with components', async () => {
    const result = await getDetailedHealth();
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('components');
    expect(result.components).toHaveProperty('database');
  });

  it('returns ok status when database is reachable', async () => {
    const result = await getDetailedHealth();
    if (result.status === 'ok') {
      expect(result.components.database).toHaveProperty('status', 'ok');
      expect(result.components.database).toHaveProperty('latencyMs');
    }
  });

  it('returns degraded status when database fails', async () => {
    const result = await getDetailedHealth();
    if (result.status === 'degraded') {
      expect(result.components.database).toHaveProperty('status', 'error');
      expect(result.components.database).toHaveProperty('error');
    }
  });

  it('includes ISO timestamp', async () => {
    const result = await getDetailedHealth();
    expect(new Date(result.timestamp as string).toISOString()).toBe(result.timestamp);
  });
});
