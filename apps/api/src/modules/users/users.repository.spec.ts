import type { Database } from '../../db/client';
import { DATABASE } from '../../db/db.module';
import { UsersRepository } from './users.repository';

function buildDb(rows: unknown[] = []): Database {
  const mockSelect = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
  const mockInsert = {
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(rows),
  };
  return {
    select: jest.fn(() => mockSelect),
    insert: jest.fn(() => mockInsert),
  } as unknown as Database;
}

describe('UsersRepository', () => {
  const mockUser = {
    id: 'user-1',
    email: 'alice@example.com',
    passwordHash: 'hashed',
    role: 'USER' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('findByEmail returns a user when found', async () => {
    const db = buildDb([mockUser]);
    const repo = new UsersRepository(db);
    const result = await repo.findByEmail(mockUser.email);
    expect(result).toEqual(mockUser);
  });

  it('findByEmail returns null when not found', async () => {
    const db = buildDb([]);
    const repo = new UsersRepository(db);
    const result = await repo.findByEmail('unknown@example.com');
    expect(result).toBeNull();
  });

  it('findById returns a user when found', async () => {
    const db = buildDb([mockUser]);
    const repo = new UsersRepository(db);
    const result = await repo.findById(mockUser.id);
    expect(result).toEqual(mockUser);
  });

  it('findById returns null when not found', async () => {
    const db = buildDb([]);
    const repo = new UsersRepository(db);
    const result = await repo.findById('nonexistent-id');
    expect(result).toBeNull();
  });

  it('create returns the newly inserted user', async () => {
    const db = buildDb([mockUser]);
    const repo = new UsersRepository(db);
    const result = await repo.create({
      email: mockUser.email,
      passwordHash: 'hashed',
    });
    expect(result).toEqual(mockUser);
  });

  it('create throws if the DB returns no row (duplicate email)', async () => {
    const db = buildDb([]); // insert returns empty — simulates duplicate rejection
    const repo = new UsersRepository(db);
    await expect(
      repo.create({ email: 'dup@example.com', passwordHash: 'x' }),
    ).rejects.toThrow('Failed to create user');
  });
});
