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

describe('POST /api/payments/send', { retry: 2 }, () => {
  it('rejects unauthenticated requests', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);
    const response = await request(server)
      .post('/api/payments/send')
      .send({ destinationPublicKey: DESTINATION_PUBLIC_KEY, amount: '10' });

    expect(response.status).toBe(401);
  });

  it('rejects a malformed destination public key', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);
    const response = await request(server)
      .post('/api/payments/send')
      .set('Authorization', `Bearer ${tokenFor('user-1')}`)
      .send({ destinationPublicKey: 'not-a-real-key', amount: '10' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-positive amount', async () => {
    const { app } = createTestApp(fakeStellarClient());
    const server = listen(app);
    const response = await request(server)
      .post('/api/payments/send')
      .set('Authorization', `Bearer ${tokenFor('user-1')}`)
      .send({ destinationPublicKey: DESTINATION_PUBLIC_KEY, amount: '0' });

    expect(response.status).toBe(400);
  });

  it('submits a payment and returns the persisted transaction as SUCCESS', async () => {
    const submitTransaction = vi.fn(async () => ({ hash: 'tx-hash-1', ledger: 3, successful: true }));
    const { app } = createTestApp(fakeStellarClient({ submitTransaction }));
    const server = listen(app);

    const response = await request(server)
      .post('/api/payments/send')
      .set('Authorization', `Bearer ${tokenFor('user-1')}`)
      .send({ destinationPublicKey: DESTINATION_PUBLIC_KEY, amount: '10' });

    expect(response.status).toBe(201);
    expect(response.body.transaction.status).toBe('SUCCESS');
    expect(response.body.transaction.stellarTxHash).toBe('tx-hash-1');
    expect(submitTransaction).toHaveBeenCalledTimes(1);
  });

  it('returns a classified error status when the payment fails on-chain', async () => {
    const { StellarPaymentError } = await import('@mixmatch/stellar');
    const submitTransaction = vi.fn(async () => {
      throw new StellarPaymentError('destination_not_found', 'destination account does not exist');
    });
    const { app } = createTestApp(fakeStellarClient({ submitTransaction }));
    const server = listen(app);

    const response = await request(server)
      .post('/api/payments/send')
      .set('Authorization', `Bearer ${tokenFor('user-1')}`)
      .send({ destinationPublicKey: DESTINATION_PUBLIC_KEY, amount: '10' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('DESTINATION_NOT_FOUND');
  });

  it('does not submit a second on-chain payment for a repeated idempotency key', async () => {
    const submitTransaction = vi.fn(async () => ({ hash: 'tx-hash-shared', ledger: 1, successful: true }));
    const { app } = createTestApp(fakeStellarClient({ submitTransaction }));
    const server = listen(app);
    const body = {
      destinationPublicKey: DESTINATION_PUBLIC_KEY,
      amount: '10',
      idempotencyKey: 'checkout-session-42',
    };
    const auth = { Authorization: `Bearer ${tokenFor('user-1')}` };

    const first = await request(server).post('/api/payments/send').set(auth).send(body);
    const second = await request(server).post('/api/payments/send').set(auth).send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.transaction.id).toBe(first.body.transaction.id);
    expect(submitTransaction).toHaveBeenCalledTimes(1);
  });

  it('provisions a Stellar account automatically for a first-time sender', async () => {
    const { app, stellarAccountRepository } = createTestApp(fakeStellarClient());
    const server = listen(app);

    await request(server)
      .post('/api/payments/send')
      .set('Authorization', `Bearer ${tokenFor('new-user')}`)
      .send({ destinationPublicKey: DESTINATION_PUBLIC_KEY, amount: '5' });

    const account = await stellarAccountRepository.findByUserId('new-user');
    expect(account).not.toBeNull();
  });
});
