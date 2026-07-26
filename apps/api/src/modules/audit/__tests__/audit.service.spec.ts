import { describe, expect, it, beforeEach } from 'vitest';
import { AuditService } from '../audit.service.js';
import { InMemoryAuditStore } from '../in-memory-audit.store.js';

describe('AuditService', () => {
  let store: InMemoryAuditStore;
  let service: AuditService;

  beforeEach(() => {
    store = new InMemoryAuditStore();
    service = new AuditService(store);
  });

  it('records an audit entry', async () => {
    await service.record('USER_REGISTERED', { actorId: 'user-1' });
    const entries = await service.findByActor('user-1');
    expect(entries).toHaveLength(1);
    expect(entries[0]!.action).toBe('USER_REGISTERED');
  });

  it('records audit entry with full context', async () => {
    await service.record('PROFILE_UPDATED', {
      actorId: 'user-2',
      resourceId: 'profile-1',
      ip: '127.0.0.1',
      userAgent: 'vitest',
      metadata: { field: 'email' },
    });
    const entries = await service.findByActor('user-2');
    expect(entries[0]!.ip).toBe('127.0.0.1');
    expect(entries[0]!.metadata).toEqual({ field: 'email' });
  });

  it('finds entries by resource', async () => {
    await service.record('USER_LOGGED_IN', { resourceId: 'res-1' });
    await service.record('USER_LOGGED_OUT', { resourceId: 'res-1' });
    const entries = await service.findByResource('res-1');
    expect(entries).toHaveLength(2);
  });

  it('counts entries by action type', async () => {
    await service.record('ACCESS_DENIED', { actorId: 'u1' });
    await service.record('ACCESS_DENIED', { actorId: 'u2' });
    await service.record('USER_LOGGED_IN', { actorId: 'u1' });

    expect(await service.countByAction('ACCESS_DENIED')).toBe(2);
    expect(await service.countByAction('USER_LOGGED_IN')).toBe(1);
  });

  it('returns empty results when no matches', async () => {
    expect(await service.findByActor('nonexistent')).toHaveLength(0);
    expect(await service.countByAction('ACCESS_DENIED')).toBe(0);
  });

  it('limits results', async () => {
    for (let i = 0; i < 10; i++) {
      await service.record('USER_REGISTERED', { actorId: 'user-batch' });
    }
    const entries = await service.findByActor('user-batch', 3);
    expect(entries).toHaveLength(3);
  });

  describe('edge cases and failure modes', () => {
    it('records entry with undefined optional fields', async () => {
      await service.record('USER_REGISTERED', {});
      const entries = await service.findByActor(undefined as unknown as string);
      expect(entries).toHaveLength(1);
      expect(entries[0]!.actorId).toBeUndefined();
      expect(entries[0]!.resourceId).toBeUndefined();
    });

    it('handles concurrent writes without data loss', async () => {
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(service.record('USER_LOGGED_IN', { actorId: `user-${i}` }));
      }
      await Promise.all(promises);

      for (let i = 0; i < 20; i++) {
        const entries = await service.findByActor(`user-${i}`);
        expect(entries).toHaveLength(1);
      }
    });

    it('findByResource returns most recent first', async () => {
      await service.record('USER_LOGGED_IN', { resourceId: 'res-1' });
      await service.record('USER_LOGGED_OUT', { resourceId: 'res-1' });

      const entries = await service.findByResource('res-1');
      expect(entries).toHaveLength(2);
      expect(entries[0]!.action).toBe('USER_LOGGED_OUT');
      expect(entries[1]!.action).toBe('USER_LOGGED_IN');
    });

    it('findByActor returns most recent first', async () => {
      await service.record('USER_REGISTERED', { actorId: 'user-1' });
      await service.record('PROFILE_UPDATED', { actorId: 'user-1' });

      const entries = await service.findByActor('user-1');
      expect(entries).toHaveLength(2);
      expect(entries[0]!.action).toBe('PROFILE_UPDATED');
      expect(entries[1]!.action).toBe('USER_REGISTERED');
    });

    it('countByAction returns 0 for unknown action', async () => {
      expect(await service.countByAction('RATE_LIMIT_EXCEEDED')).toBe(0);
    });

    it('handles entries with large metadata objects', async () => {
      const largeMetadata = { data: 'x'.repeat(10000) };
      await service.record('PROFILE_UPDATED', { actorId: 'user-1', metadata: largeMetadata });

      const entries = await service.findByActor('user-1');
      expect(entries[0]!.metadata).toEqual(largeMetadata);
    });

    it('handles entries with special characters in IP', async () => {
      await service.record('ACCESS_DENIED', { ip: '::1' });
      const entries = await service.findByActor(undefined as unknown as string);
      expect(entries[0]!.ip).toBe('::1');
    });

    it('multiple actors can have entries with same resourceId', async () => {
      await service.record('USER_LOGGED_IN', { actorId: 'user-1', resourceId: 'session-1' });
      await service.record('ACCESS_DENIED', { actorId: 'user-2', resourceId: 'session-1' });

      const entries = await service.findByResource('session-1');
      expect(entries).toHaveLength(2);
    });

    it('default limit is 50', async () => {
      for (let i = 0; i < 60; i++) {
        await service.record('USER_REGISTERED', { actorId: 'user-default-limit' });
      }
      const entries = await service.findByActor('user-default-limit');
      expect(entries).toHaveLength(50);
    });

    it('limit of 0 returns empty array', async () => {
      await service.record('USER_REGISTERED', { actorId: 'user-1' });
      const entries = await service.findByActor('user-1', 0);
      expect(entries).toHaveLength(0);
    });
  });
});
