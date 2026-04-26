import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

// Set environment variables before importing app
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

// Dynamic imports to ensure env vars are set
let createApp: any;
let User: any;
let Session: any;
let startMongo: any;
let stopMongo: any;
let clearCollections: any;

before(async () => {
  const mongoHelper = await import('./helpers/mongo');
  startMongo = mongoHelper.startMongo;
  stopMongo = mongoHelper.stopMongo;
  clearCollections = mongoHelper.clearCollections;
  
  await startMongo();
  
  const appModule = await import('../src/app');
  createApp = appModule.createApp;
  
  const userModule = await import('../src/domains/identity/user.model');
  User = userModule.default;
  
  const sessionModule = await import('../src/domains/identity/session.model');
  Session = sessionModule.default;
});

beforeEach(async () => {
  if (clearCollections) {
    await clearCollections(User as any, Session as any);
  }
});

after(async () => {
  if (stopMongo) {
    await stopMongo();
  }
});

test('POST /auth/logout revokes current session', async () => {
  const app = createApp();
  const reg = await request(app)
    .post('/auth/register')
    .send({ email: 'logout_user@example.com', password: 'password123', role: 'DJ' });

  assert.equal(reg.status, 201, `Register failed: ${JSON.stringify(reg.body)}`);
  
  const token = reg.body.data.token as string;
  const sessionId = reg.body.data.sessionId as string;

  assert.ok(sessionId, 'Should return sessionId on register');

  // Verify me endpoint works with the token
  let meRes = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(meRes.status, 200);

  // Logout
  const logoutRes = await request(app)
    .post('/auth/logout')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(logoutRes.status, 200);
  assert.equal(logoutRes.body.data.message, 'Logged out successfully');

  // Verify session is revoked
  const session = await Session.findOne({ sessionId });
  assert.equal(session?.status, 'REVOKED');

  // Verify me endpoint no longer works
  meRes = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(meRes.status, 401);
});

test('POST /auth/logout is idempotent', async () => {
  const app = createApp();
  const reg = await request(app)
    .post('/auth/register')
    .send({ email: 'idem_user@example.com', password: 'password123', role: 'PLANNER' });

  const token = reg.body.data.token as string;

  // Logout
  let logoutRes = await request(app)
    .post('/auth/logout')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(logoutRes.status, 200);

  // Logout again with the same revoked token (middleware will catch it)
  logoutRes = await request(app)
    .post('/auth/logout')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(logoutRes.status, 401);
});

test('POST /auth/logout-all revokes all sessions for user', async () => {
  const app = createApp();
  // Register (Session 1)
  const reg = await request(app)
    .post('/auth/register')
    .send({ email: 'multi_session@example.com', password: 'password123', role: 'MUSIC_LOVER' });

  const token1 = reg.body.data.token as string;

  // Login again (Session 2)
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'multi_session@example.com', password: 'password123' });

  const token2 = loginRes.body.data.token as string;

  // Logout All using token1
  const logoutRes = await request(app)
    .post('/auth/logout-all')
    .set('Authorization', `Bearer ${token1}`);
  
  assert.equal(logoutRes.status, 200);

  // Verify both tokens are dead
  let meRes = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token1}`);
  assert.equal(meRes.status, 401);

  meRes = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token2}`);
  assert.equal(meRes.status, 401);
});
