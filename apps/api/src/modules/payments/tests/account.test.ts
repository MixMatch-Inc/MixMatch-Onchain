import type { Server } from 'node:http';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';
import { fakeStellarClient } from './fake-stellar-client.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-abcdefghijklmnopqrstuvwxyz123';

function tokenFor(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET);
}

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

describe('GET /api/payments/account', { retry: 2 }, () => {
  it('rejects unauthenticated requests', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);

    const response = await request(server).get('/api/payments/account');

    expect(response.status).toBe(401);
  });

  it('provisions and returns an account on first call', async () => {
    const { app, stellarAccountRepository } = createTestApp(fakeStellarClient());
    const server = listen(app);

    const response = await request(server)
      .get('/api/payments/account')
      .set('Authorization', `Bearer ${tokenFor('new-user')}`);

    expect(response.status).toBe(200);
    expect(response.body.account.publicKey).toMatch(/^G[A-Z2-7]{55}$/);
    expect(response.body.account.network).toBeDefined();

    const stored = await stellarAccountRepository.findByUserId('new-user');
    expect(stored).not.toBeNull();
  });

  it('returns the same account on repeat calls', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);
    const auth = { Authorization: `Bearer ${tokenFor('repeat-user')}` };

    const first = await request(server).get('/api/payments/account').set(auth);
    const second = await request(server).get('/api/payments/account').set(auth);

    expect(first.body.account.publicKey).toBe(second.body.account.publicKey);
  });

  it('never leaks the encrypted secret key in the response', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);

    const response = await request(server)
      .get('/api/payments/account')
      .set('Authorization', `Bearer ${tokenFor('secret-check-user')}`);

    expect(response.body.account.encryptedSecretKey).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('encryptedSecretKey');
  });
});
