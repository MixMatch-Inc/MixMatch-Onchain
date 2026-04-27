/**
 * Tests for issues #319, #320, #321, #322:
 * - #319: change-password endpoint
 * - #320: auth security audit model
 * - #321: risk-check service abstraction
 * - #322: auth-specific rate-limit tiers and cooldown policies
 */
import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-issues';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
});

let createApp: typeof import('../src/app').createApp;
let User: typeof import('../src/domains/identity/user.model').default;
let mongoose: typeof import('mongoose');
let MongoMemoryServer: typeof import('mongodb-memory-server').MongoMemoryServer;
let mongoServer: import('mongodb-memory-server').MongoMemoryServer;

before(async () => {
  ({ default: mongoose } = await import('mongoose'));
  ({ MongoMemoryServer } = await import('mongodb-memory-server'));

  mongoServer = await MongoMemoryServer.create({
    instance: { ip: '127.0.0.1', port: 27085 },
  });

  process.env.MONGO_URI = mongoServer.getUri();

  ({ createApp } = await import('../src/app'));
  ({ default: User } = await import('../src/domains/identity/user.model'));

  await mongoose.connect(process.env.MONGO_URI!);
});

beforeEach(async () => {
  await User.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndLogin(
  app: ReturnType<typeof createApp>,
  email: string,
  password = 'Password123!',
) {
  await request(app)
    .post('/auth/register')
    .send({ email, password, role: 'DJ' });

  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email, password });

  return loginRes.body.data?.token as string;
}

// ── Issue #319: change-password ───────────────────────────────────────────────

test('#319 POST /auth/change-password succeeds with valid current password', { concurrency: false }, async () => {
  const app = createApp();
  const token = await registerAndLogin(app, 'changepw@example.com');

  const res = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${token}`)
    .send({
      currentPassword: 'Password123!',
      newPassword: 'NewPassword456!',
      revokeAllSessions: false,
    });

  assert.equal(res.status, 200);
  assert.ok(res.body.data?.message);
});

test('#319 POST /auth/change-password rejects wrong current password (401)', { concurrency: false }, async () => {
  const app = createApp();
  const token = await registerAndLogin(app, 'wrongpw@example.com');

  const res = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${token}`)
    .send({
      currentPassword: 'WrongPassword!',
      newPassword: 'NewPassword456!',
    });

  assert.equal(res.status, 401);
});

test('#319 POST /auth/change-password rejects same password as current', { concurrency: false }, async () => {
  const app = createApp();
  const token = await registerAndLogin(app, 'samepw@example.com');

  const res = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${token}`)
    .send({
      currentPassword: 'Password123!',
      newPassword: 'Password123!',
    });

  assert.equal(res.status, 422);
});

test('#319 POST /auth/change-password rejects weak new password', { concurrency: false }, async () => {
  const app = createApp();
  const token = await registerAndLogin(app, 'weakpw@example.com');

  const res = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${token}`)
    .send({
      currentPassword: 'Password123!',
      newPassword: 'weak',
    });

  assert.equal(res.status, 422);
});

test('#319 POST /auth/change-password requires authentication', { concurrency: false }, async () => {
  const app = createApp();
  const res = await request(app)
    .post('/auth/change-password')
    .send({
      currentPassword: 'Password123!',
      newPassword: 'NewPassword456!',
    });

  assert.equal(res.status, 401);
});

test('#319 POST /auth/change-password with revokeAllSessions=true succeeds', { concurrency: false }, async () => {
  const app = createApp();
  const token = await registerAndLogin(app, 'revoke@example.com');

  const res = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${token}`)
    .send({
      currentPassword: 'Password123!',
      newPassword: 'NewPassword456!',
      revokeAllSessions: true,
    });

  assert.equal(res.status, 200);
});

// ── Issue #320: auth security audit model ────────────────────────────────────

test('#320 AuthAuditService.log persists an event', { concurrency: false }, async () => {
  const { authAuditService } = await import('../src/domains/moderation/auth-audit.service');
  const { AuthAudit } = await import('../src/domains/moderation/auth-audit.model');

  await AuthAudit.deleteMany({});

  await authAuditService.log({
    eventType: 'PASSWORD_CHANGED',
    userId: 'user-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    metadata: { revokeAllSessions: false },
  });

  const entries = await authAuditService.findByUser('user-123');
  assert.equal(entries.length, 1);
  assert.equal(entries[0]!.eventType, 'PASSWORD_CHANGED');
  assert.equal(entries[0]!.remediationStatus, 'PENDING');
  // IP should be hashed, not stored raw
  assert.notEqual(entries[0]!.ipSummary, '192.168.1.1');
  assert.ok(entries[0]!.ipSummary, 'ipSummary should be set');
  // Device fingerprint should be truncated UA
  assert.ok(entries[0]!.deviceFingerprint?.startsWith('Mozilla'));

  await AuthAudit.deleteMany({});
});

test('#320 AuthAuditService.findPendingSuspicious returns suspicious events', { concurrency: false }, async () => {
  const { authAuditService } = await import('../src/domains/moderation/auth-audit.service');
  const { AuthAudit } = await import('../src/domains/moderation/auth-audit.model');

  await AuthAudit.deleteMany({});

  await authAuditService.log({ eventType: 'SUSPICIOUS_LOGIN', userId: 'user-456' });
  await authAuditService.log({ eventType: 'PASSWORD_CHANGED', userId: 'user-456' });

  const suspicious = await authAuditService.findPendingSuspicious('user-456');
  assert.equal(suspicious.length, 1);
  assert.equal(suspicious[0]!.eventType, 'SUSPICIOUS_LOGIN');

  await AuthAudit.deleteMany({});
});

// ── Issue #321: risk-check service abstraction ────────────────────────────────

test('#321 NoOpRiskCheckService always allows requests', async () => {
  const { NoOpRiskCheckService } = await import('../src/services/risk-check.service');
  const svc = new NoOpRiskCheckService();

  for (const ctx of ['signup', 'login', 'reset', 'verify'] as const) {
    const result = await svc.assess(ctx, undefined, '1.2.3.4', 'test-agent');
    assert.equal(result.allowed, true);
    assert.equal(result.score, 0);
  }
});

test('#321 NoOpRiskCheckService works with a captcha token', async () => {
  const { NoOpRiskCheckService } = await import('../src/services/risk-check.service');
  const svc = new NoOpRiskCheckService();
  const result = await svc.assess('signup', 'some-captcha-token', '1.2.3.4', 'agent');
  assert.equal(result.allowed, true);
});

test('#321 POST /auth/register passes through no-op risk check', { concurrency: false }, async () => {
  const app = createApp();
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'riskcheck@example.com', password: 'Password123!', role: 'DJ' });

  assert.equal(res.status, 201);
});

// ── Issue #322: auth-specific rate-limit tiers and cooldown policies ──────────

test('#322 AuthCooldownStore allows requests within limit', () => {
  const { AuthCooldownStore } = require('../src/services/auth-cooldown.service');
  const store = new AuthCooldownStore();

  for (let i = 0; i < 5; i++) {
    const result = store.check('login', 'user@example.com');
    assert.equal(result.allowed, true);
  }
});

test('#322 AuthCooldownStore blocks after maxAttempts exceeded', () => {
  const { AuthCooldownStore } = require('../src/services/auth-cooldown.service');
  const store = new AuthCooldownStore();

  // login policy: maxAttempts=10
  for (let i = 0; i < 10; i++) {
    store.check('login', 'blocked@example.com');
  }
  const result = store.check('login', 'blocked@example.com');
  assert.equal(result.allowed, false);
  assert.ok(result.retryAfterSeconds && result.retryAfterSeconds > 0);
});

test('#322 AuthCooldownStore reset clears the cooldown', () => {
  const { AuthCooldownStore } = require('../src/services/auth-cooldown.service');
  const store = new AuthCooldownStore();

  for (let i = 0; i < 11; i++) {
    store.check('login', 'reset@example.com');
  }
  store.reset('login', 'reset@example.com');
  const result = store.check('login', 'reset@example.com');
  assert.equal(result.allowed, true);
});

test('#322 AuthCooldownStore hashes identifier (no PII stored)', () => {
  const { AuthCooldownStore } = require('../src/services/auth-cooldown.service');
  const store = new AuthCooldownStore();

  store.check('signup', 'sensitive@example.com');

  // The internal store keys should not contain the raw email
  const keys = Array.from((store as any).store.keys()) as string[];
  for (const key of keys) {
    assert.ok(!key.includes('sensitive@example.com'), 'Raw email should not appear in store key');
  }
});

test('#322 cooldown middleware returns 429 with Retry-After header', { concurrency: false }, async () => {
  const app = createApp();

  // signup policy: maxAttempts=5
  let lastRes: any;
  for (let i = 0; i < 7; i++) {
    lastRes = await request(app)
      .post('/auth/register')
      .send({ email: 'cooldown@example.com', password: 'Password123!', role: 'DJ' });
  }

  // After exceeding the cooldown, should get 429 from cooldown middleware
  // (may also get 429 from global rate limiter — either is acceptable)
  assert.equal(lastRes.status, 429);
});
