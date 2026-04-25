import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuditAction, IAuditLogEntry } from '../../src/domains/moderation/audit-log.model';

// In-memory audit log for testing
class InMemoryAuditLog {
  private entries: IAuditLogEntry[] = [];

  async log(params: Omit<IAuditLogEntry, 'createdAt'>): Promise<void> {
    this.entries.push({ ...params, createdAt: new Date() });
  }

  async findByActor(actorId: string): Promise<IAuditLogEntry[]> {
    return this.entries.filter((e) => e.actorId === actorId);
  }

  async findByTarget(targetId: string): Promise<IAuditLogEntry[]> {
    return this.entries.filter((e) => e.targetId === targetId);
  }
}

describe('AuditLog', () => {
  it('logs a WALLET_LINKED action and retrieves by actor', async () => {
    const log = new InMemoryAuditLog();
    await log.log({ action: 'WALLET_LINKED', actorId: 'user1', targetId: 'user1' });
    const entries = await log.findByActor('user1');
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].action, 'WALLET_LINKED');
  });

  it('logs a MODERATION_TRANSITION and retrieves by target', async () => {
    const log = new InMemoryAuditLog();
    await log.log({ action: 'MODERATION_TRANSITION', actorId: 'admin1', targetId: 'user2', reason: 'spam' });
    const entries = await log.findByTarget('user2');
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].reason, 'spam');
  });

  it('logs ACCOUNT_PRIVACY_CHANGED and retrieves by actor', async () => {
    const log = new InMemoryAuditLog();
    await log.log({ action: 'ACCOUNT_PRIVACY_CHANGED', actorId: 'user3', targetId: 'user3' });
    const entries = await log.findByActor('user3');
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].action, 'ACCOUNT_PRIVACY_CHANGED');
  });

  it('findByActor returns empty for unknown actor', async () => {
    const log = new InMemoryAuditLog();
    const entries = await log.findByActor('nobody');
    assert.deepStrictEqual(entries, []);
  });
});
