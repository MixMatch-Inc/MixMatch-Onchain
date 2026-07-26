import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaPropertyRepository } from '../properties.repository.js';
import { RepositoryError } from '../../../shared/database/repository-errors.js';

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    property: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const { prisma } = await import('../../../shared/database/prisma.js');
const mockPrisma = vi.mocked(prisma);

describe('PrismaPropertyRepository', () => {
  let repo: PrismaPropertyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PrismaPropertyRepository();
  });

  describe('findById', () => {
    it('returns a property when found', async () => {
      const fake = {
        id: 'p1',
        name: 'color',
        description: 'Item color',
        type: 'STRING',
        required: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.property.findUnique.mockResolvedValue(fake);

      const result = await repo.findById('p1');
      expect(result).toEqual(fake);
    });

    it('returns null when not found', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);
      const result = await repo.findById('missing');
      expect(result).toBeNull();
    });

    it('rejects empty id', async () => {
      await expect(repo.findById('')).rejects.toThrow(RepositoryError);
    });
  });

  describe('findByName', () => {
    it('returns a property when found', async () => {
      const fake = {
        id: 'p1',
        name: 'color',
        description: null,
        type: 'STRING',
        required: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.property.findUnique.mockResolvedValue(fake);

      const result = await repo.findByName('color');
      expect(result).toEqual(fake);
      expect(mockPrisma.property.findUnique).toHaveBeenCalledWith({
        where: { name: 'color' },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);
      const result = await repo.findByName('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates with defaults', async () => {
      const created = {
        id: 'p2',
        name: 'size',
        description: null,
        type: 'STRING',
        required: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.property.create.mockResolvedValue(created);

      const result = await repo.create({ name: 'size' });
      expect(result).toEqual(created);
      expect(mockPrisma.property.create).toHaveBeenCalledWith({
        data: { name: 'size', description: null, type: 'STRING', required: false },
      });
    });

    it('creates with custom values', async () => {
      const created = {
        id: 'p3',
        name: 'weight',
        description: 'In kg',
        type: 'NUMBER',
        required: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.property.create.mockResolvedValue(created);

      const result = await repo.create({
        name: 'weight',
        description: 'In kg',
        type: 'NUMBER',
        required: true,
      });
      expect(result).toEqual(created);
    });

    it('rejects missing name', async () => {
      await expect(repo.create({ name: '' })).rejects.toThrow(RepositoryError);
    });
  });

  describe('update', () => {
    it('updates and returns', async () => {
      const updated = {
        id: 'p1',
        name: 'color_v2',
        description: null,
        type: 'STRING',
        required: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.property.update.mockResolvedValue(updated);

      const result = await repo.update('p1', { name: 'color_v2' });
      expect(result).toEqual(updated);
    });

    it('wraps not-found errors', async () => {
      const err = new Error('Record to update not found');
      (err as any).code = 'P2025';
      mockPrisma.property.update.mockRejectedValue(err);

      await expect(
        repo.update('missing', { name: 'x' }),
      ).rejects.toThrow(RepositoryError);
    });
  });

  describe('delete', () => {
    it('deletes successfully', async () => {
      mockPrisma.property.delete.mockResolvedValue(undefined as any);
      await expect(repo.delete('p1')).resolves.toBeUndefined();
    });

    it('wraps not-found errors', async () => {
      const err = new Error('Record to delete not found');
      (err as any).code = 'P2025';
      mockPrisma.property.delete.mockRejectedValue(err);

      await expect(repo.delete('missing')).rejects.toThrow(RepositoryError);
    });
  });
});
