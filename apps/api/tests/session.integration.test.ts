import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;
let createApp: typeof import('../src/app').createApp;
let User: typeof import('../src/domains/identity/user.model').default;
let WalletLinkage: any;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'test-secret';
  process.env.CORS_ORIGIN = 'http://localhost:3000';

  ({ createApp } = await import('../src/app'));
  ({ default: User } = await import('../src/domains/identity/user.model'));
  ({ WalletLinkage } = await import('../src/domains/wallets/wallet-linkage.model'));

  await mongoose.connect(process.env.MONGO_URI!);
});

beforeEach(async () => {
  await User.deleteMany({});
  await WalletLinkage.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test('GET /auth/session returns 401 without token', async () => {
  const app = createApp();
  const response = await request(app).get('/auth/session');
  assert.equal(response.status, 401);
});

test('GET /auth/session returns full session details when authenticated', async () => {
  const app = createApp();
  
  // Register a user
  const regResponse = await request(app)
    .post('/auth/register')
    .send({ email: 'session@example.com', password: 'password123', role: 'DJ' });
  
  const token = regResponse.body.data.token;
  const userId = regResponse.body.data.user.id;

  // Create a wallet linkage for the user
  await WalletLinkage.create({
    userId: new mongoose.Types.ObjectId(userId),
    stellarAccountId: 'GD6W6X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X',
    network: 'TESTNET',
    status: 'ACTIVE',
    keyProvenance: 'USER_GENERATED'
  });

  const response = await request(app)
    .get('/auth/session')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  const data = response.body.data;

  // Check profile
  assert.equal(data.profile.email, 'session@example.com');
  assert.equal(data.profile.role, 'DJ');
  assert.equal(data.profile.onboardingCompleted, false);

  // Check session metadata
  assert.ok(data.session.issuedAt);
  assert.ok(data.session.expiresAt);
  assert.ok(data.session.ageSeconds >= 0);
  assert.equal(data.session.sessionId, userId);

  // Check account state
  assert.equal(data.accountState.status, 'ACTIVE');
  assert.equal(data.accountState.isVerified, true);
  assert.equal(data.accountState.isRestricted, false);

  // Check providers
  assert.equal(data.providers.length, 1);
  assert.equal(data.providers[0].type, 'STELLAR');
  assert.equal(data.providers[0].linked, true);
  assert.equal(data.providers[0].externalId, 'GD6W6X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X7X');

  // Check flags
  assert.equal(data.flags.requiresOnboarding, true);
  assert.equal(data.flags.canTransact, true);
});
