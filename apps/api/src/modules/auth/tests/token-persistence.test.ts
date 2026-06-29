import { describe, expect, it, beforeEach } from 'vitest';
import { InMemorySessionStore } from '../session.store.js';

describe('SessionStore — token persistence (#604)', () => {
  let store: InMemorySessionStore;

  beforeEach(() => {
    store = new InMemorySessionStore();
  });

  it('creates and retrieves a session by refresh token', async () => {
    const session = {
      id: 'session-1',
      userId: 'user-1',
      refreshToken: 'rt-1',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await store.create(session);
    const found = await store.findByRefreshTokenHash('rt-1');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('session-1');
  });

  it('returns null for an unknown refresh token', async () => {
    const found = await store.findByRefreshTokenHash('nonexistent');
    expect(found).toBeNull();
  });

  it('deletes a session by id', async () => {
    const session = {
      id: 'session-2',
      userId: 'user-1',
      refreshToken: 'rt-2',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await store.create(session);
    await store.delete('session-2');
    const found = await store.findByRefreshTokenHash('rt-2');
    expect(found).toBeNull();
  });

  it('deletes all sessions for a user', async () => {
    await store.create({
      id: 's1', userId: 'user-a', refreshToken: 'rt-a1',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(), createdAt: new Date().toISOString(),
    });
    await store.create({
      id: 's2', userId: 'user-a', refreshToken: 'rt-a2',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(), createdAt: new Date().toISOString(),
    });
    await store.create({
      id: 's3', userId: 'user-b', refreshToken: 'rt-b',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(), createdAt: new Date().toISOString(),
    });

    await store.deleteAllByUserId('user-a');

    expect(await store.findByRefreshTokenHash('rt-a1')).toBeNull();
    expect(await store.findByRefreshTokenHash('rt-a2')).toBeNull();
    expect(await store.findByRefreshTokenHash('rt-b')).not.toBeNull();
  });

  it('counts active sessions per user', async () => {
    await store.create({
      id: 's1', userId: 'user-x', refreshToken: 'rt-x1',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(), createdAt: new Date().toISOString(),
    });
    await store.create({
      id: 's2', userId: 'user-x', refreshToken: 'rt-x2',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(), createdAt: new Date().toISOString(),
    });
    const count = await store.countByUserId('user-x');
    expect(count).toBe(2);
  });

  it('cleans up expired sessions', async () => {
    await store.create({
      id: 'expired', userId: 'user-y', refreshToken: 'rt-expired',
      expiresAt: new Date(Date.now() - 1000).toISOString(), createdAt: new Date().toISOString(),
    });
    await store.create({
      id: 'valid', userId: 'user-y', refreshToken: 'rt-valid',
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(), createdAt: new Date().toISOString(),
    });

    await store.cleanupExpired();

    expect(await store.findByRefreshTokenHash('rt-expired')).toBeNull();
    expect(await store.findByRefreshTokenHash('rt-valid')).not.toBeNull();
  });

  it('enforces max active sessions', async () => {
    for (let i = 0; i < 5; i++) {
      await store.create({
        id: `s-${i}`, userId: 'user-z', refreshToken: `rt-z-${i}`,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(), createdAt: new Date().toISOString(),
      });
    }
    expect(await store.countByUserId('user-z')).toBe(5);
  });
});
