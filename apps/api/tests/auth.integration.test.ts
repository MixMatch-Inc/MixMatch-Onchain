import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

// ── Test bootstrap ────────────────────────────────────────────────────────────
// Environment vars must be set BEFORE any app module is imported so that
// env.ts validation passes without a real .env file.
before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
});

// Lazy imports — resolved after env vars are set.
let createApp: typeof import('../src/app').createApp;
let User: typeof import('../src/domains/identity/user.model').default;
let EmailVerificationToken: typeof import('../src/domains/identity/email-verification-token.model').default;
let mongoose: typeof import('mongoose');
let MongoMemoryServer: typeof import('mongodb-memory-server').MongoMemoryServer;
let mongoServer: import('mongodb-memory-server').MongoMemoryServer;

before(async () => {
  ({ default: mongoose } = await import('mongoose'));
  ({ MongoMemoryServer } = await import('mongodb-memory-server'));

  mongoServer = await MongoMemoryServer.create({
    instance: { ip: '127.0.0.1', port: 27082 },
  });

  process.env.MONGO_URI = mongoServer.getUri();

  ({ createApp } = await import('../src/app'));
  ({ default: User } = await import('../src/domains/identity/user.model'));
  ({ default: EmailVerificationToken } = await import(
    '../src/domains/identity/email-verification-token.model'
  ));

  await mongoose.connect(process.env.MONGO_URI!);
});

beforeEach(async () => {
  await User.deleteMany({});
  await EmailVerificationToken.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function registerUser(
  app: ReturnType<typeof createApp>,
  email: string,
  role = 'DJ',
) {
  return request(app)
    .post('/auth/register')
    .send({ email, password: 'Password123!', role });
}

async function getTokenForUser(userId: string): Promise<string | null> {
  const doc = await EmailVerificationToken.findOne({ userId }).sort({ createdAt: -1 }).lean();
  if (!doc) return null;
  // We can reconstruct the raw hex by reading tokenHash from DB only in tests.
  // The actual service stores the hash — we need the token from the DB to simulate the email link.
  // In test, we directly query the token hash and use it to back-derive.
  // Since we can't un-hash SHA-256, we hook into the console email output instead.
  // For simplicity in integration tests: use a spy approach by replacing emailService.
  return null;
}

// ── Registration ─────────────────────────────────────────────────────────────

test('registers a user and returns 201 with token', { concurrency: false }, async () => {
  const app = createApp();
  const res = await registerUser(app, 'dj@example.com');

  assert.equal(res.status, 201);
  assert.equal(typeof res.body.data.token, 'string');
  assert.equal(res.body.data.user.email, 'dj@example.com');
});

test('new user has PENDING_VERIFICATION status in DB', { concurrency: false }, async () => {
  const app = createApp();
  await registerUser(app, 'pending@example.com');

  const user = await User.findOne({ email: 'pending@example.com' }).lean();
  assert.ok(user, 'User should exist in DB');
  assert.equal(user!.accountStatus, 'PENDING_VERIFICATION');
});

test('registers and creates a verification token record', { concurrency: false }, async () => {
  const app = createApp();
  const res = await registerUser(app, 'tokencheck@example.com');
  assert.equal(res.status, 201);

  // Give the fire-and-forget a tick to complete
  await new Promise((r) => setImmediate(r));

  const user = await User.findOne({ email: 'tokencheck@example.com' }).lean();
  const tokenDoc = await EmailVerificationToken.findOne({ userId: user!._id }).lean();
  assert.ok(tokenDoc, 'A verification token should be created after registration');
  assert.ok(tokenDoc!.expiresAt > new Date(), 'Token should not already be expired');
  assert.ok(!tokenDoc!.consumedAt, 'Token should not be consumed yet');
  assert.ok(!tokenDoc!.supersededAt, 'Token should not be superseded yet');
});

test('rejects duplicate registration (409)', { concurrency: false }, async () => {
  const app = createApp();
  await registerUser(app, 'dup@example.com');
  const res = await registerUser(app, 'dup@example.com');
  assert.equal(res.status, 409);
});

// ── Login ─────────────────────────────────────────────────────────────────────

test('logs in an existing user', { concurrency: false }, async () => {
  const app = createApp();
  await registerUser(app, 'login@example.com', 'PLANNER');

  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'login@example.com', password: 'Password123!' });

  assert.equal(res.status, 200);
  assert.equal(typeof res.body.data.token, 'string');
  assert.equal(res.body.data.user.role, 'PLANNER');
});

test('login rejects bad password (401)', { concurrency: false }, async () => {
  const app = createApp();
  await registerUser(app, 'badpass@example.com');

  const res = await request(app)
    .post('/auth/login')
    .send({ email: 'badpass@example.com', password: 'wrong-password' });

  assert.equal(res.status, 401);
});

// ── /auth/me ──────────────────────────────────────────────────────────────────

test('GET /auth/me returns current user when authenticated', { concurrency: false }, async () => {
  const app = createApp();
  const reg = await registerUser(app, 'me@example.com');
  const token = reg.body.data.token as string;

  const res = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.user.email, 'me@example.com');
});

test('GET /auth/me returns 401 without token', { concurrency: false }, async () => {
  const app = createApp();
  const res = await request(app).get('/auth/me');
  assert.equal(res.status, 401);
});

// ── Email verification — confirm ──────────────────────────────────────────────

test('confirm with valid token activates the account', { concurrency: false }, async () => {
  const app = createApp();
  await registerUser(app, 'activate@example.com');
  await new Promise((r) => setImmediate(r));

  const user = await User.findOne({ email: 'activate@example.com' }).lean();
  const tokenDoc = await EmailVerificationToken.findOne({ userId: user!._id }).lean();
  assert.ok(tokenDoc, 'Token record should exist');

  // We cannot reverse a SHA-256 hash, but we can generate a matching raw token
  // by hooking into the service directly in the test. Instead, we test via the
  // confirm endpoint using a token we construct in the DB for deterministic tests.
  // Re-issue a token we control by calling the service directly.
  const { EmailVerificationService } = await import('../src/domains/identity/email-verification.service');
  const { container } = await import('../src/config/di');

  let capturedRawToken = '';
  const stubEmail = {
    sendVerificationEmail: async (_to: string, rawToken: string) => {
      capturedRawToken = rawToken;
    },
  };

  const svc = new EmailVerificationService(
    container.emailVerificationTokenRepository,
    container.userRepository,
    stubEmail,
  );

  await svc.issueToken(String(user!._id), user!.email);
  assert.ok(capturedRawToken, 'Should have captured the raw token');

  const confirmRes = await request(app)
    .get(`/auth/verify/confirm?token=${capturedRawToken}`);

  assert.equal(confirmRes.status, 200);

  const updatedUser = await User.findById(user!._id).lean();
  assert.equal(updatedUser!.accountStatus, 'ACTIVE');
});

test('confirm with an already-consumed token returns 401', { concurrency: false }, async () => {
  const app = createApp();
  await registerUser(app, 'consumed@example.com');
  await new Promise((r) => setImmediate(r));

  const user = await User.findOne({ email: 'consumed@example.com' }).lean();
  const { EmailVerificationService } = await import('../src/domains/identity/email-verification.service');
  const { container } = await import('../src/config/di');

  let capturedRawToken = '';
  const stubEmail = { sendVerificationEmail: async (_: string, t: string) => { capturedRawToken = t; } };
  const svc = new EmailVerificationService(container.emailVerificationTokenRepository, container.userRepository, stubEmail);
  await svc.issueToken(String(user!._id), user!.email);

  // First confirm — should succeed
  await request(app).get(`/auth/verify/confirm?token=${capturedRawToken}`);

  // Second confirm — same token, should fail
  const res = await request(app).get(`/auth/verify/confirm?token=${capturedRawToken}`);
  assert.equal(res.status, 401); // AUTH_TOKEN_INVALID maps to 401 via error middleware
});

test('confirm with an expired token returns 401', { concurrency: false }, async () => {
  const app = createApp();
  await registerUser(app, 'expired@example.com');
  await new Promise((r) => setImmediate(r));

  const user = await User.findOne({ email: 'expired@example.com' }).lean();

  // Force-expire the token by back-dating expiresAt
  await EmailVerificationToken.updateMany(
    { userId: user!._id },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );

  const { EmailVerificationService } = await import('../src/domains/identity/email-verification.service');
  const { container } = await import('../src/config/di');

  let capturedRawToken = '';
  const stubEmail = { sendVerificationEmail: async (_: string, t: string) => { capturedRawToken = t; } };
  // Issue a fresh token we can then expire
  const svc = new EmailVerificationService(container.emailVerificationTokenRepository, container.userRepository, stubEmail);
  await svc.issueToken(String(user!._id), user!.email);

  // Immediately expire it
  await EmailVerificationToken.updateMany(
    { userId: user!._id, consumedAt: { $exists: false } },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );

  const res = await request(app).get(`/auth/verify/confirm?token=${capturedRawToken}`);
  assert.equal(res.status, 401); // AUTH_TOKEN_EXPIRED maps to 401
});

// ── Resend flow ───────────────────────────────────────────────────────────────

test('resend supersedes previous token', { concurrency: false }, async () => {
  const app = createApp();
  const reg = await registerUser(app, 'resend@example.com');
  await new Promise((r) => setImmediate(r));

  const user = await User.findOne({ email: 'resend@example.com' }).lean();
  const firstToken = await EmailVerificationToken.findOne({ userId: user!._id })
    .sort({ createdAt: -1 })
    .lean();

  // Request a resend via the API
  const token = reg.body.data.token as string;
  await request(app)
    .post('/auth/verify/request')
    .set('Authorization', `Bearer ${token}`);

  await new Promise((r) => setImmediate(r));

  const firstTokenUpdated = await EmailVerificationToken.findById(firstToken!._id).lean();
  assert.ok(firstTokenUpdated!.supersededAt, 'Prior token should be superseded after resend');
});

test('resend rate-limit: 4th request within 60s returns 429', { concurrency: false }, async () => {
  const app = createApp();
  const reg = await registerUser(app, 'ratelimit@example.com');
  await new Promise((r) => setImmediate(r));

  const token = reg.body.data.token as string;

  // Three more resends (register already issued one, so total will be 4 attempts)
  for (let i = 0; i < 2; i++) {
    await request(app)
      .post('/auth/verify/request')
      .set('Authorization', `Bearer ${token}`);
    await new Promise((r) => setImmediate(r));
  }

  // 4th attempt should be rate-limited
  const res = await request(app)
    .post('/auth/verify/request')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 429);
});

// ── Verification status ───────────────────────────────────────────────────────

test('GET /auth/verify/status returns verified: false for new user', { concurrency: false }, async () => {
  const app = createApp();
  const reg = await registerUser(app, 'status@example.com');
  const token = reg.body.data.token as string;

  const res = await request(app)
    .get('/auth/verify/status')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.verified, false);
});

test('GET /auth/verify/status returns verified: true after confirmation', { concurrency: false }, async () => {
  const app = createApp();
  const reg = await registerUser(app, 'statusok@example.com');
  await new Promise((r) => setImmediate(r));

  const user = await User.findOne({ email: 'statusok@example.com' }).lean();
  const { EmailVerificationService } = await import('../src/domains/identity/email-verification.service');
  const { container } = await import('../src/config/di');

  let capturedRawToken = '';
  const stubEmail = { sendVerificationEmail: async (_: string, t: string) => { capturedRawToken = t; } };
  const svc = new EmailVerificationService(container.emailVerificationTokenRepository, container.userRepository, stubEmail);
  await svc.issueToken(String(user!._id), user!.email);

  await request(app).get(`/auth/verify/confirm?token=${capturedRawToken}`);

  const statusRes = await request(app)
    .get('/auth/verify/status')
    .set('Authorization', `Bearer ${reg.body.data.token}`);

  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body.data.verified, true);
});
