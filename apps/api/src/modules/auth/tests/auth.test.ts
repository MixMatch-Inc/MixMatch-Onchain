import type { Server } from 'node:http';
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';

// Explicitly bind one real server per test and reuse it for every request in
// that test — `request(app)` (an Express app, not a listening server) binds
// a fresh ephemeral server per call, which is flaky when a test fires
// several requests back to back.
let servers: Server[] = [];

function listen(app: Express): Server {
  const server = app.listen(0);
  servers.push(server);
  return server;
}

afterEach(() => {
  for (const server of servers) server.close();
  servers = [];
});

describe('auth: register, login, me', { retry: 2 }, () => {
  it('registers a new user and returns an access token', async () => {
    const server = listen(createTestApp());
    const response = await request(server)
      .post('/api/auth/register')
      .send({ email: 'new-user@example.com', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('new-user@example.com');
    expect(typeof response.body.accessToken).toBe('string');
  });

  it('rejects registering the same email twice', async () => {
    const server = listen(createTestApp());
    const credentials = { email: 'dup@example.com', password: 'password123' };

    await request(server).post('/api/auth/register').send(credentials);
    const response = await request(server).post('/api/auth/register').send(credentials);

    expect(response.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    const server = listen(createTestApp());
    const credentials = { email: 'login-user@example.com', password: 'password123' };

    await request(server).post('/api/auth/register').send(credentials);
    const response = await request(server).post('/api/auth/login').send(credentials);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(credentials.email);
  });

  it('rejects login with the wrong password', async () => {
    const server = listen(createTestApp());
    const email = 'wrong-password@example.com';
    await request(server).post('/api/auth/register').send({ email, password: 'password123' });

    const response = await request(server).post('/api/auth/login').send({ email, password: 'incorrect' });

    expect(response.status).toBe(401);
  });

  it('returns the authenticated user for GET /me with a valid token', async () => {
    const server = listen(createTestApp());
    const credentials = { email: 'me-user@example.com', password: 'password123' };
    const registerResponse = await request(server).post('/api/auth/register').send(credentials);
    const { accessToken } = registerResponse.body;

    const response = await request(server).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(credentials.email);
  });

  it('rejects GET /me without a token', async () => {
    const server = listen(createTestApp());
    const response = await request(server).get('/api/auth/me');
    expect(response.status).toBe(401);
  });
});
