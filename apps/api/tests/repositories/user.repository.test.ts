import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IUserRepository, IUser } from '../../src/repositories';

// In-memory double for testing
class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, IUser> = new Map();

  async findById(id: string): Promise<IUser | null> {
    return this.users.get(id) || null;
  }

  async findAll(filter?: Partial<IUser>): Promise<IUser[]> {
    let users = Array.from(this.users.values());
    if (filter) {
      users = users.filter((user) => {
        return Object.entries(filter).every(([key, value]) => user[key as keyof IUser] === value);
      });
    }
    return users;
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    const id = `user-${this.users.size + 1}`;
    const user: IUser = {
      id,
      name: data.name || '',
      email: data.email || '',
      passwordHash: data.passwordHash || '',
      role: data.role || 'FAN',
      onboardingCompleted: data.onboardingCompleted || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const users = Array.from(this.users.values());
    return users.find((u) => u.email === email) || null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const users = Array.from(this.users.values());
    return users.some((u) => u.email === email);
  }
}

describe('InMemoryUserRepository', () => {
  it('should create and find a user', async () => {
    const repo = new InMemoryUserRepository();
    const user = await repo.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hash123',
      role: 'FAN',
    });

    assert.ok(user.id);
    assert.strictEqual(user.name, 'Test User');
    assert.strictEqual(user.email, 'test@example.com');

    const found = await repo.findById(user.id);
    assert.ok(found);
    assert.strictEqual(found?.email, 'test@example.com');
  });

  it('should check if email exists', async () => {
    const repo = new InMemoryUserRepository();
    await repo.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hash123',
      role: 'FAN',
    });

    const exists = await repo.existsByEmail('test@example.com');
    assert.strictEqual(exists, true);

    const notExists = await repo.existsByEmail('nonexistent@example.com');
    assert.strictEqual(notExists, false);
  });

  it('should find user by email', async () => {
    const repo = new InMemoryUserRepository();
    await repo.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hash123',
      role: 'FAN',
    });

    const user = await repo.findByEmail('test@example.com');
    assert.ok(user);
    assert.strictEqual(user?.name, 'Test User');
  });

  it('should update a user', async () => {
    const repo = new InMemoryUserRepository();
    const user = await repo.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hash123',
      role: 'FAN',
    });

    const updated = await repo.update(user.id, {
      onboardingCompleted: true,
    });

    assert.ok(updated);
    assert.strictEqual(updated?.onboardingCompleted, true);
  });

  it('should delete a user', async () => {
    const repo = new InMemoryUserRepository();
    const user = await repo.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hash123',
      role: 'FAN',
    });

    const deleted = await repo.delete(user.id);
    assert.strictEqual(deleted, true);

    const found = await repo.findById(user.id);
    assert.strictEqual(found, null);
  });
});
