import { describe, expect, it } from 'vitest';
import { InMemoryUserRepository, type UserRepository } from '../users.repository.js';
import type { User } from '../users.types.js';

function assertUserRepositoryContract(repo: UserRepository) {
  describe('UserRepository interface contract', () => {
    it('create returns a user with an id', async () => {
      const user = await repo.create({ email: 'contract@example.com', passwordHash: 'hash' });
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('string');
      expect(user.email).toBe('contract@example.com');
      expect(user.passwordHash).toBe('hash');
      expect(user.role).toBe('USER');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('findByEmail returns the user after create', async () => {
      await repo.create({ email: 'findme@example.com', passwordHash: 'hash' });
      const found = await repo.findByEmail('findme@example.com');
      expect(found).not.toBeNull();
      expect(found!.email).toBe('findme@example.com');
    });

    it('findByEmail returns null for unknown email', async () => {
      const found = await repo.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });

    it('findById returns the user after create', async () => {
      const created = await repo.create({ email: 'byid@example.com', passwordHash: 'hash' });
      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('findById returns null for unknown id', async () => {
      const found = await repo.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });

    it('update changes the user fields', async () => {
      const created = await repo.create({ email: 'update@example.com', passwordHash: 'old' });
      const updated = await repo.update(created.id, { email: 'updated@example.com' });
      expect(updated.email).toBe('updated@example.com');
      expect(updated.passwordHash).toBe('old');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('update changes passwordHash', async () => {
      const created = await repo.create({ email: 'pw@example.com', passwordHash: 'old' });
      const updated = await repo.update(created.id, { passwordHash: 'new-hash' });
      expect(updated.passwordHash).toBe('new-hash');
    });

    it('update throws for non-existent user', async () => {
      await expect(
        repo.update('00000000-0000-0000-0000-000000000000', { email: 'x@x.com' }),
      ).rejects.toThrow();
    });

    it('multiple users have unique ids', async () => {
      const u1 = await repo.create({ email: 'a@example.com', passwordHash: 'h' });
      const u2 = await repo.create({ email: 'b@example.com', passwordHash: 'h' });
      expect(u1.id).not.toBe(u2.id);
    });
  });
}

describe('InMemoryUserRepository', () => {
  const repo = new InMemoryUserRepository();
  assertUserRepositoryContract(repo);
});

describe('User type contract', () => {
  it('User type has required fields', () => {
    const user: User = {
      id: 'test-id',
      email: 'test@example.com',
      passwordHash: 'hash',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(user.id).toBe('test-id');
    expect(user.email).toBe('test@example.com');
    expect(user.passwordHash).toBe('hash');
    expect(user.role).toBe('USER');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });
});
