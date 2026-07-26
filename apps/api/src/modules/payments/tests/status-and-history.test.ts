import type { Server } from 'node:http';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from './test-app.js';
import { fakeStellarClient } from './fake-stellar-client.js';
import { DESTINATION_PUBLIC_KEY } from './fixtures.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-abcdefghijklmnopqrstuvwxyz123';

function tokenFor(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET);
}

// Explicitly bind one real server per test and reuse it for every request in
// that test — `request(app)` (an Express app, not a listening server) binds
// a fresh ephemeral server per call, which is flaky when a test fires
// several requests back to back (port-reuse races under load).
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

async function sendPayment(server: Server, userId: string, overrides: Record<string, unknown> = {}) {
  return request(server)
    .post('/api/payments/send')
    .set('Authorization', `Bearer ${tokenFor(userId)}`)
    .send({
      destinationPublicKey: DESTINATION_PUBLIC_KEY,
      amount: '10',
      ...overrides,
    });
}

describe('GET /api/payments/:id/status', { retry: 2 }, () => {
  it('returns 401 when unauthenticated', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);
    const response = await request(server).get('/api/payments/some-id/status');
    expect(response.status).toBe(401);
  });

  it('returns 404 for a nonexistent transaction', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);
    const response = await request(server)
      .get('/api/payments/does-not-exist/status')
      .set('Authorization', `Bearer ${tokenFor('user-1')}`);
    expect(response.status).toBe(404);
  });

  it("returns 403 when requesting another user's transaction", async () => {
    const { app } = createTestApp(
      fakeStellarClient({ submitTransaction: async () => ({ hash: 'tx-hash', ledger: 1, successful: true }) }),
    );
    const server = listen(app);
    const sendResponse = await sendPayment(server, 'user-1');
    const transactionId = sendResponse.body.transaction.id;

    const response = await request(server)
      .get(`/api/payments/${transactionId}/status`)
      .set('Authorization', `Bearer ${tokenFor('user-2')}`);

    expect(response.status).toBe(403);
  });

  it("returns the owner's transaction status", async () => {
    const { app } = createTestApp(
      fakeStellarClient({ submitTransaction: async () => ({ hash: 'tx-hash', ledger: 1, successful: true }) }),
    );
    const server = listen(app);
    const sendResponse = await sendPayment(server, 'user-1');
    const transactionId = sendResponse.body.transaction.id;

    const response = await request(server)
      .get(`/api/payments/${transactionId}/status`)
      .set('Authorization', `Bearer ${tokenFor('user-1')}`);

    expect(response.status).toBe(200);
    expect(response.body.transaction.status).toBe('SUCCESS');
  });
});

describe('POST /api/payments/:id/reconcile', { retry: 2 }, () => {
  it("returns 403 when reconciling another user's transaction", async () => {
    const { app } = createTestApp(
      fakeStellarClient({ submitTransaction: async () => ({ hash: 'tx-hash', ledger: 1, successful: true }) }),
    );
    const server = listen(app);
    const sendResponse = await sendPayment(server, 'user-1');
    const transactionId = sendResponse.body.transaction.id;

    const response = await request(server)
      .post(`/api/payments/${transactionId}/reconcile`)
      .set('Authorization', `Bearer ${tokenFor('user-2')}`);

    expect(response.status).toBe(403);
  });

  it('is a no-op for an already-SUCCESS transaction', async () => {
    const { app } = createTestApp(
      fakeStellarClient({ submitTransaction: async () => ({ hash: 'tx-hash', ledger: 1, successful: true }) }),
    );
    const server = listen(app);
    const sendResponse = await sendPayment(server, 'user-1');
    const transactionId = sendResponse.body.transaction.id;

    const response = await request(server)
      .post(`/api/payments/${transactionId}/reconcile`)
      .set('Authorization', `Bearer ${tokenFor('user-1')}`);

    expect(response.status).toBe(200);
    expect(response.body.transaction.status).toBe('SUCCESS');
    expect(response.body.transaction.stellarTxHash).toBe('tx-hash');
  });
});

describe('GET /api/payments/history', { retry: 2 }, () => {
  it('returns 401 when unauthenticated', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);
    const response = await request(server).get('/api/payments/history');
    expect(response.status).toBe(401);
  });

  it('returns an empty list for a user with no Stellar account yet', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);
    const response = await request(server)
      .get('/api/payments/history')
      .set('Authorization', `Bearer ${tokenFor('brand-new-user')}`);

    expect(response.status).toBe(200);
    expect(response.body.transactions).toEqual([]);
    expect(response.body.total).toBe(0);
  });

  it("lists only the caller's own transactions, newest first", async () => {
    const submitTransaction = vi
      .fn()
      .mockResolvedValueOnce({ hash: 'tx-1', ledger: 1, successful: true })
      .mockResolvedValueOnce({ hash: 'tx-2', ledger: 2, successful: true })
      .mockResolvedValueOnce({ hash: 'other-user-tx', ledger: 3, successful: true });
    const { app } = createTestApp(fakeStellarClient({ submitTransaction }));
    const server = listen(app);

    const first = await sendPayment(server, 'user-1', { idempotencyKey: 'a' });
    const second = await sendPayment(server, 'user-1', { idempotencyKey: 'b' });
    const third = await sendPayment(server, 'user-2', { idempotencyKey: 'c' });
    expect([first.status, second.status, third.status]).toEqual([201, 201, 201]);

    const response = await request(server).get('/api/payments/history').set('Authorization', `Bearer ${tokenFor('user-1')}`);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.transactions).toHaveLength(2);
    expect(response.body.transactions.every((tx: { stellarTxHash: string }) => tx.stellarTxHash !== 'other-user-tx')).toBe(
      true,
    );
  });

  it('paginates with page/limit query params', async () => {
    const submitTransaction = vi.fn(async () => ({ hash: `tx-${Math.random()}`, ledger: 1, successful: true }));
    const { app } = createTestApp(fakeStellarClient({ submitTransaction }));
    const server = listen(app);

    for (let i = 0; i < 3; i++) {
      const result = await sendPayment(server, 'user-1', { idempotencyKey: `key-${i}` });
      expect(result.status).toBe(201);
    }

    const response = await request(server)
      .get('/api/payments/history?page=1&limit=2')
      .set('Authorization', `Bearer ${tokenFor('user-1')}`);

    expect(response.status).toBe(200);
    expect(response.body.transactions).toHaveLength(2);
    expect(response.body.total).toBe(3);
  });

  it('rejects an invalid page/limit value', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);
    const response = await request(server)
      .get('/api/payments/history?page=0')
      .set('Authorization', `Bearer ${tokenFor('user-1')}`);

    expect(response.status).toBe(400);
  });
});
