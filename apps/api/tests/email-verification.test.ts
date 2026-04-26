/**
 * Unit tests for EmailVerificationService.
 * All dependencies are injected as in-memory stubs — no Mongoose or HTTP.
 */
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { AccountStatus, EmailVerificationEventType } from '@mixmatch/types';
import { EmailVerificationService } from '../src/domains/identity/email-verification.service';
import type { IEmailVerificationTokenRepository } from '../src/repositories/email-verification-token.repository';
import type { IUserRepository } from '../src/repositories/user.repository';
import type { IEmailService } from '../src/services/email.service';

// ── Stub builders ─────────────────────────────────────────────────────────────

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function makeUser(overrides: Partial<{ id: string; email: string; accountStatus: AccountStatus }> = {}) {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hash',
    role: 'DJ',
    onboardingCompleted: false,
    accountStatus: AccountStatus.PENDING_VERIFICATION,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeToken(overrides: Record<string, unknown> = {}) {
  const raw = crypto.randomBytes(32).toString('hex');
  return {
    id: 'token-1',
    userId: 'user-1',
    tokenHash: sha256(raw),
    _rawToken: raw, // test-only convenience field
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    resendCount: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeTokenRepo(overrides: Partial<IEmailVerificationTokenRepository> = {}): IEmailVerificationTokenRepository {
  const store: Map<string, ReturnType<typeof makeToken>> = new Map();

  return {
    async create(data) {
      const doc = { id: `token-${store.size + 1}`, ...data, createdAt: new Date() } as any;
      store.set(doc.id, doc);
      return doc;
    },
    async findActiveByUserId(userId) {
      const now = new Date();
      for (const doc of [...store.values()].reverse()) {
        if (
          doc.userId === userId &&
          !doc.consumedAt &&
          !doc.supersededAt &&
          doc.expiresAt > now
        ) {
          return doc;
        }
      }
      return null;
    },
    async findByTokenHash(hash) {
      for (const doc of store.values()) {
        if (doc.tokenHash === hash) return doc as any;
      }
      return null;
    },
    async markConsumed(id) {
      const doc = store.get(id);
      if (doc) doc.consumedAt = new Date();
    },
    async supersedePriorTokens(userId, exceptId) {
      let count = 0;
      const now = new Date();
      for (const doc of store.values()) {
        if (
          doc.userId === userId &&
          doc.id !== exceptId &&
          !doc.consumedAt &&
          !doc.supersededAt &&
          doc.expiresAt > now
        ) {
          doc.supersededAt = new Date();
          count++;
        }
      }
      return count;
    },
    async countRecentByUserId(userId, windowMs) {
      const since = new Date(Date.now() - windowMs);
      return [...store.values()].filter(
        (d) => d.userId === userId && d.createdAt >= since,
      ).length;
    },
    ...overrides,
  };
}

function makeUserRepo(user: ReturnType<typeof makeUser>): IUserRepository {
  const users = new Map([[user.id, user]]);
  return {
    async findById(id) { return users.get(id) ?? null; },
    async findAll() { return [...users.values()]; },
    async create(data) {
      const u = { ...makeUser(), ...data, id: `user-${Date.now()}` } as any;
      users.set(u.id, u);
      return u;
    },
    async update(id, data) {
      const u = users.get(id);
      if (!u) return null;
      Object.assign(u, data);
      return u;
    },
    async delete(id) { return users.delete(id); },
    async findByEmail(email) {
      return [...users.values()].find((u) => u.email === email) ?? null;
    },
    async existsByEmail(email) {
      return [...users.values()].some((u) => u.email === email);
    },
  };
}

function makeEmailService(): IEmailService & { lastRawToken: string } {
  const svc = {
    lastRawToken: '',
    async sendVerificationEmail(_to: string, rawToken: string) {
      svc.lastRawToken = rawToken;
    },
  };
  return svc;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EmailVerificationService.issueToken', () => {
  test('creates a token record and sends an email', async () => {
    const user = makeUser();
    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(user);
    const emailSvc = makeEmailService();
    const events: string[] = [];

    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc, (e) =>
      events.push(e.type),
    );

    await svc.issueToken(user.id, user.email);

    assert.ok(emailSvc.lastRawToken, 'Should send an email with a raw token');
    assert.equal(emailSvc.lastRawToken.length, 64, 'Raw token should be 64 hex chars');
    assert.ok(events.includes(EmailVerificationEventType.ISSUED), 'Should emit ISSUED event');
  });

  test('supersedes a previous active token on re-issue', async () => {
    const user = makeUser();
    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(user);
    const emailSvc = makeEmailService();
    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc);

    await svc.issueToken(user.id, user.email); // first
    const afterFirst = await tokenRepo.findActiveByUserId(user.id);
    assert.ok(afterFirst, 'First token should be active');

    await svc.issueToken(user.id, user.email); // second (resend)

    const stillActive = await tokenRepo.findActiveByUserId(user.id);
    assert.ok(stillActive, 'Second token should be active');
    assert.notEqual(stillActive!.id, afterFirst!.id, 'Active token should be the new one');

    // The first token must be superseded
    const firstTokenDoc = await tokenRepo.findByTokenHash(afterFirst!.tokenHash);
    assert.ok(firstTokenDoc!.supersededAt, 'First token should be superseded');
  });

  test('throws rate-limit error after 3 tokens in 60s', async () => {
    const user = makeUser();
    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(user);
    const emailSvc = makeEmailService();
    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc);

    await svc.issueToken(user.id, user.email);
    await svc.issueToken(user.id, user.email);
    await svc.issueToken(user.id, user.email);

    await assert.rejects(
      () => svc.issueToken(user.id, user.email),
      (err: any) => {
        assert.equal(err.code, 'INFRASTRUCTURE_005');
        return true;
      },
      'Should reject with rate-limit error on 4th attempt',
    );
  });
});

describe('EmailVerificationService.confirmToken', () => {
  test('confirms a valid token and activates the user', async () => {
    const user = makeUser();
    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(user);
    const emailSvc = makeEmailService();
    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc);
    const events: string[] = [];
    const svcWithEvents = new EmailVerificationService(tokenRepo, userRepo, emailSvc, (e) =>
      events.push(e.type),
    );

    await svc.issueToken(user.id, user.email);
    const rawToken = emailSvc.lastRawToken;

    await svcWithEvents.confirmToken(rawToken);

    const updatedUser = await userRepo.findById(user.id);
    assert.equal((updatedUser as any).accountStatus, AccountStatus.ACTIVE);
    assert.ok(events.includes(EmailVerificationEventType.CONFIRMED));
  });

  test('throws AUTH_TOKEN_INVALID for an unknown token', async () => {
    const user = makeUser();
    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(user);
    const emailSvc = makeEmailService();
    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc);

    const fakeToken = crypto.randomBytes(32).toString('hex');
    await assert.rejects(
      () => svc.confirmToken(fakeToken),
      (err: any) => {
        assert.equal(err.code, 'AUTH_004');
        return true;
      },
    );
  });

  test('throws AUTH_TOKEN_INVALID for an already-consumed token (single-use)', async () => {
    const user = makeUser();
    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(user);
    const emailSvc = makeEmailService();
    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc);

    await svc.issueToken(user.id, user.email);
    const rawToken = emailSvc.lastRawToken;

    await svc.confirmToken(rawToken); // first use — ok
    await assert.rejects(
      () => svc.confirmToken(rawToken), // second use — must fail
      (err: any) => {
        assert.equal(err.code, 'AUTH_004');
        return true;
      },
    );
  });

  test('throws AUTH_TOKEN_EXPIRED for an expired token', async () => {
    const user = makeUser();
    const emailSvc = makeEmailService();

    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(user);
    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc);

    await svc.issueToken(user.id, user.email);
    const rawToken = emailSvc.lastRawToken;

    // Force expire the token in the mock repo
    const tokenHash = sha256(rawToken);
    const doc = await tokenRepo.findByTokenHash(tokenHash);
    if (doc) doc.expiresAt = new Date(Date.now() - 1000);

    await assert.rejects(
      () => svc.confirmToken(rawToken),
      (err: any) => {
        assert.equal(err.code, 'AUTH_003'); // AUTH_TOKEN_EXPIRED
        return true;
      },
    );
  });

  test('superseded token is rejected as invalid', async () => {
    const user = makeUser();
    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(user);
    const emailSvc = makeEmailService();
    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc);

    await svc.issueToken(user.id, user.email);
    const firstRaw = emailSvc.lastRawToken;

    // Re-issue — supersedes the first
    await svc.issueToken(user.id, user.email);

    await assert.rejects(
      () => svc.confirmToken(firstRaw),
      (err: any) => {
        assert.equal(err.code, 'AUTH_004'); // AUTH_TOKEN_INVALID
        return true;
      },
    );
  });
});

describe('EmailVerificationService.getStatus', () => {
  test('returns verified: false for PENDING_VERIFICATION user', async () => {
    const user = makeUser();
    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(user);
    const emailSvc = makeEmailService();
    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc);

    await svc.issueToken(user.id, user.email);
    const status = await svc.getStatus(user.id);

    assert.equal(status.verified, false);
    assert.equal(status.pendingToken, true);
    assert.ok(status.expiresAt instanceof Date);
  });

  test('returns verified: true for ACTIVE user', async () => {
    const user = makeUser({ accountStatus: AccountStatus.ACTIVE });
    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(user);
    const emailSvc = makeEmailService();
    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc);

    const status = await svc.getStatus(user.id);
    assert.equal(status.verified, true);
    assert.equal(status.pendingToken, false);
  });

  test('throws AUTH_USER_NOT_FOUND for unknown userId', async () => {
    const tokenRepo = makeTokenRepo();
    const userRepo = makeUserRepo(makeUser());
    const emailSvc = makeEmailService();
    const svc = new EmailVerificationService(tokenRepo, userRepo, emailSvc);

    await assert.rejects(
      () => svc.getStatus('nonexistent-user'),
      (err: any) => {
        assert.equal(err.code, 'AUTH_005');
        return true;
      },
    );
  });
});
