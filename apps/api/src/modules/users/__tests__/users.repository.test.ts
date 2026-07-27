import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaUserRepository } from '../users.repository.js';
import { RepositoryError } from '../../../shared/database/repository-errors.js';

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { prisma } = await import('../../../shared/database/prisma.js');
// The mocked module's `prisma.user.*` methods are plain `vi.fn()`s at
// runtime, but the imported binding keeps the real (non-mock) Prisma
// method signatures at the type level — cast to access mock helpers.
const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('PrismaUserRepository', () => {
  let repo: PrismaUserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PrismaUserRepository();
  });

  describe('findByEmail', () => {
    it('returns a user when found', async () => {
      const fakeUser = {
        id: 'u1',
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser);

      const result = await repo.findByEmail('test@example.com');

      expect(result).toEqual(fakeUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repo.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });

    it('wraps Prisma errors into RepositoryError', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error('connection refused'),
      );

      await expect(repo.findByEmail('test@example.com')).rejects.toThrow(
        RepositoryError,
      );
    });
  });

  describe('findById', () => {
    it('returns a user when found', async () => {
      const fakeUser = {
        id: 'u1',
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValue(fakeUser);

      const result = await repo.findById('u1');

      expect(result).toEqual(fakeUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('rejects empty id', async () => {
      await expect(repo.findById('')).rejects.toThrow(RepositoryError);
    });
  });

  describe('create', () => {
    it('creates and returns a user', async () => {
      const input = { email: 'new@example.com', passwordHash: 'hashed' };
      const created = {
        id: 'u2',
        ...input,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await repo.create(input);

      expect(result).toEqual(created);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { ...input, role: 'USER' },
      });
    });

    it('wraps Prisma errors on create', async () => {
      mockPrisma.user.create.mockRejectedValue(
        new Error('unique constraint'),
      );

      await expect(
        repo.create({ email: 'dup@example.com', passwordHash: 'h' }),
      ).rejects.toThrow(RepositoryError);
    });
  });

  describe('update', () => {
    it('updates and returns the user', async () => {
      const updated = {
        id: 'u1',
        email: 'updated@example.com',
        passwordHash: 'hash',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await repo.update('u1', {
        email: 'updated@example.com',
      });

      expect(result).toEqual(updated);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { email: 'updated@example.com' },
      });
    });

    it('wraps Prisma not-found on update', async () => {
      const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      mockPrisma.user.update.mockRejectedValue(prismaError);

      await expect(
        repo.update('nonexistent', { email: 'x@x.com' }),
      ).rejects.toThrow(RepositoryError);
    });
  });
});
