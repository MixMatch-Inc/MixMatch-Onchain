import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test-app.js';

const JWT_SECRET =
  process.env.JWT_SECRET ?? 'dev-secret-change-me-abcdefghijklmnopqrstuvwxyz123';

/**
 * Regression coverage for GET /api/auth/me.
 *
 * Complements me.test.ts (route protection) and me-hardening.test.ts (edge cases).
 * Focuses on response contract, user isolation, token integrity, and integration flows.
 *
 * Track: me endpoint  |  Sprint 1  |  issue #775
 */
describe('GET /api/auth/me — regression coverage', () => {
  // ── Response contract ────────────────────────────────────────────────────

  describe('response shape', () => {
    it('returns exactly id, email, role, createdAt, updatedAt', async () => {
      const app = createTestApp();
      const creds = { email: 'shape@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);
      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.accessToken}`);

      expect(me.status).toBe(200);
      const user = me.body.user;
      expect(Object.keys(user).sort()).toEqual([
        'createdAt',
        'email',
        'id',
        'role',
        'updatedAt',
      ]);
    });

    it('returns a valid UUID for user id', async () => {
      const app = createTestApp();
      const creds = { email: 'uuid@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);
      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.accessToken}`);

      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(me.body.user.id).toMatch(uuidRe);
    });

    it('returns ISO 8601 strings for createdAt and updatedAt', async () => {
      const app = createTestApp();
      const creds = { email: 'timestamps@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);
      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.accessToken}`);

      const isoRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      expect(me.body.user.createdAt).toMatch(isoRe);
      expect(me.body.user.updatedAt).toMatch(isoRe);
    });

    it('returns role as a string', async () => {
      const app = createTestApp();
      const creds = { email: 'role@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);
      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.accessToken}`);

      expect(typeof me.body.user.role).toBe('string');
      expect(me.body.user.role.length).toBeGreaterThan(0);
    });

    it('wraps user in { user } envelope', async () => {
      const app = createTestApp();
      const creds = { email: 'envelope@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);
      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.accessToken}`);

      expect(me.status).toBe(200);
      expect(me.body).toHaveProperty('user');
      expect(Object.keys(me.body)).toEqual(['user']);
    });
  });

  // ── User isolation ───────────────────────────────────────────────────────

  describe('user isolation', () => {
    it('returns the correct user when two users are registered', async () => {
      const app = createTestApp();
      const userA = { email: 'isolation-a@example.com', password: 'password123' };
      const userB = { email: 'isolation-b@example.com', password: 'password456' };

      const regA = await request(app).post('/api/auth/register').send(userA);
      const regB = await request(app).post('/api/auth/register').send(userB);

      const meA = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${regA.body.accessToken}`);
      const meB = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${regB.body.accessToken}`);

      expect(meA.body.user.email).toBe(userA.email);
      expect(meB.body.user.email).toBe(userB.email);
      expect(meA.body.user.id).not.toBe(meB.body.user.id);
    });

    it('user A token cannot access user B data', async () => {
      const app = createTestApp();
      const userA = { email: 'leak-a@example.com', password: 'password123' };
      const userB = { email: 'leak-b@example.com', password: 'password456' };

      const regA = await request(app).post('/api/auth/register').send(userA);
      await request(app).post('/api/auth/register').send(userB);

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${regA.body.accessToken}`);

      expect(me.body.user.email).toBe(userA.email);
      expect(me.body.user.email).not.toBe(userB.email);
    });
  });

  // ── Token integrity ──────────────────────────────────────────────────────

  describe('token integrity', () => {
    it('rejects a token with a tampered payload', async () => {
      const app = createTestApp();
      const creds = { email: 'tamper@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);

      // Decode and re-sign with a different sub
      const decoded = jwt.decode(reg.body.accessToken) as jwt.JwtPayload;
      const tampered = jwt.sign(
        { ...decoded, sub: '00000000-0000-0000-0000-000000000000' },
        JWT_SECRET,
      );

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tampered}`);

      // Should return 404 since the sub points to a non-existent user
      expect(me.status).toBe(404);
    });

    it('rejects a token with a tampered signature', async () => {
      const app = createTestApp();
      const creds = { email: 'sig@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);
      const parts = reg.body.accessToken.split('.');

      // Flip last char of signature
      const lastChar = parts[2][parts[2].length - 1];
      parts[2] =
        parts[2].slice(0, -1) + (lastChar === 'A' ? 'B' : 'A');

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${parts.join('.')}`);

      expect(me.status).toBe(401);
      expect(me.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects a token with a structurally valid but unverifiable payload', async () => {
      const app = createTestApp();
      // Craft a base64url-encoded payload that looks valid but isn't signed by our secret
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: 'user-id', iat: Date.now(), exp: 9999999999 })).toString('base64url');
      const fakeSig = Buffer.from('definitely-not-valid-signature-data!!').toString('base64url');
      const token = `${header}.${payload}.${fakeSig}`;

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(me.status).toBe(401);
      expect(me.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  // ── Bearer header variations ─────────────────────────────────────────────

  describe('Bearer header variations', () => {
    it('rejects lowercase "bearer" prefix', async () => {
      const app = createTestApp();
      const creds = { email: 'lower@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `bearer ${reg.body.accessToken}`);

      expect(me.status).toBe(401);
      expect(me.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects "Bearer" without a space after', async () => {
      const app = createTestApp();
      const creds = { email: 'nospac@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer${reg.body.accessToken}`);

      expect(me.status).toBe(401);
    });

    it('rejects extra whitespace around token', async () => {
      const app = createTestApp();
      const creds = { email: 'extraspace@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer  ${reg.body.accessToken}`);

      expect(me.status).toBe(401);
    });
  });

  // ── Integration flows ────────────────────────────────────────────────────

  describe('integration flows', () => {
    it('login token works for /me', async () => {
      const app = createTestApp();
      const creds = { email: 'flow@example.com', password: 'password123' };
      await request(app).post('/api/auth/register').send(creds);

      const login = await request(app).post('/api/auth/login').send(creds);
      expect(login.status).toBe(200);

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`);

      expect(me.status).toBe(200);
      expect(me.body.user.email).toBe(creds.email);
    });

    it('register token immediately works for /me', async () => {
      const app = createTestApp();
      const creds = { email: 'immediate@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.accessToken}`);

      expect(me.status).toBe(200);
      expect(me.body.user.email).toBe(creds.email);
      expect(reg.body.user.email).toBe(creds.email);
    });

    it('register and login return the same user id', async () => {
      const app = createTestApp();
      const creds = { email: 'sameid@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);
      const login = await request(app).post('/api/auth/login').send(creds);

      const meReg = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.accessToken}`);
      const meLogin = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`);

      expect(meReg.body.user.id).toBe(meLogin.body.user.id);
    });

    it('concurrent /me requests return identical data', async () => {
      const app = createTestApp();
      const creds = { email: 'concurrent@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);

      const [res1, res2, res3] = await Promise.all(
        [1, 2, 3].map(() =>
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${reg.body.accessToken}`),
        ),
      );

      expect(res1.body.user).toEqual(res2.body.user);
      expect(res2.body.user).toEqual(res3.body.user);
    });
  });

  // ── Edge: bad JSON body interference ─────────────────────────────────────

  describe('method not allowed', () => {
    it('POST to /me returns 404 or 405 (not 200)', async () => {
      const app = createTestApp();
      const creds = { email: 'method@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);

      const res = await request(app)
        .post('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.accessToken}`)
        .send({});

      expect(res.status).not.toBe(200);
    });

    it('DELETE to /me returns 404 or 405 (not 200)', async () => {
      const app = createTestApp();
      const creds = { email: 'delete@example.com', password: 'password123' };
      const reg = await request(app).post('/api/auth/register').send(creds);

      const res = await request(app)
        .delete('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.accessToken}`);

      expect(res.status).not.toBe(200);
    });
  });
});
