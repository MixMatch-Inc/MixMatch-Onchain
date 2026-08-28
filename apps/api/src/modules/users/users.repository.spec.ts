import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  it('looks up a user by email', async () => {
    const limit = jest.fn().mockResolvedValue([
      {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: null,
        role: 'USER',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    ]);
    const where = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where });
    const select = jest.fn().mockReturnValue({ from });
    const repo = new UsersRepository({ select } as any);

    await expect(repo.findByEmail('user@example.com')).resolves.toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
    });
    expect(select).toHaveBeenCalled();
  });

  it('creates a user record', async () => {
    const returning = jest.fn().mockResolvedValue([
      {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hash',
        role: 'USER',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    ]);
    const values = jest.fn().mockReturnValue({ returning });
    const insert = jest.fn().mockReturnValue({ values });
    const repo = new UsersRepository({ insert } as any);

    await expect(
      repo.create({
        email: 'user@example.com',
        passwordHash: 'hash',
      }),
    ).resolves.toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
    });
    expect(insert).toHaveBeenCalled();
  });
});
