import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IBlocklistRepository } from '../../src/repositories/blocklist.repository';

class InMemoryBlocklistRepository implements IBlocklistRepository {
  private blocks = new Set<string>();

  private key(a: string, b: string) { return `${a}:${b}`; }

  async block(blockerId: string, blockedId: string): Promise<void> {
    this.blocks.add(this.key(blockerId, blockedId));
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    this.blocks.delete(this.key(blockerId, blockedId));
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    return this.blocks.has(this.key(blockerId, blockedId));
  }

  async isMutuallyExcluded(userA: string, userB: string): Promise<boolean> {
    return this.blocks.has(this.key(userA, userB)) || this.blocks.has(this.key(userB, userA));
  }

  async getBlockedIds(userId: string): Promise<string[]> {
    const result: string[] = [];
    for (const key of this.blocks) {
      const [blocker, blocked] = key.split(':');
      if (blocker === userId) result.push(blocked);
    }
    return result;
  }
}

describe('IBlocklistRepository', () => {
  it('block and isBlocked', async () => {
    const repo = new InMemoryBlocklistRepository();
    await repo.block('user1', 'user2');
    assert.strictEqual(await repo.isBlocked('user1', 'user2'), true);
    assert.strictEqual(await repo.isBlocked('user2', 'user1'), false);
  });

  it('unblock removes the block', async () => {
    const repo = new InMemoryBlocklistRepository();
    await repo.block('user1', 'user2');
    await repo.unblock('user1', 'user2');
    assert.strictEqual(await repo.isBlocked('user1', 'user2'), false);
  });

  it('isMutuallyExcluded is true if either party blocked the other', async () => {
    const repo = new InMemoryBlocklistRepository();
    await repo.block('user2', 'user1');
    assert.strictEqual(await repo.isMutuallyExcluded('user1', 'user2'), true);
  });

  it('isMutuallyExcluded is false when no block exists', async () => {
    const repo = new InMemoryBlocklistRepository();
    assert.strictEqual(await repo.isMutuallyExcluded('user1', 'user2'), false);
  });

  it('getBlockedIds returns all blocked users', async () => {
    const repo = new InMemoryBlocklistRepository();
    await repo.block('user1', 'user2');
    await repo.block('user1', 'user3');
    const ids = await repo.getBlockedIds('user1');
    assert.deepStrictEqual(ids.sort(), ['user2', 'user3']);
  });

  it('block is idempotent', async () => {
    const repo = new InMemoryBlocklistRepository();
    await repo.block('user1', 'user2');
    await repo.block('user1', 'user2');
    const ids = await repo.getBlockedIds('user1');
    assert.strictEqual(ids.length, 1);
  });
});
