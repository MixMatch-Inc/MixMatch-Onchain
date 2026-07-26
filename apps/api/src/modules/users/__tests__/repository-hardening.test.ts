import { describe, expect, it, vi } from 'vitest';
import { InMemoryUserRepository } from '../users.repository.js';
import { InMemoryPropertyRepository } from '../../properties/properties.repository.js';
import {
  RepositoryError,
  validateId,
  validateRequired,
  isTransientError,
  wrapPrismaError,
  withRetry,
} from '../../../shared/database/repository-errors.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('InMemoryUserRepository', () => {
  it('create then findById', async () => {
    const repo = new InMemoryUserRepository();
    const user = await repo.create({
      email: 'a@b.com',
      passwordHash: 'h',
    });
    const found = await repo.findById(user.id);
    expect(found).toEqual(user);
  });

  it('findByEmail returns null for missing', async () => {
    const repo = new InMemoryUserRepository();
    expect(await repo.findByEmail('no@no.com')).toBeNull();
  });

  it('update throws for missing id', async () => {
    const repo = new InMemoryUserRepository();
    await expect(repo.update('nope', { email: 'x@x.com' })).rejects.toThrow(
      'User not found',
    );
  });
});

describe('InMemoryPropertyRepository', () => {
  it('create then findById', async () => {
    const repo = new InMemoryPropertyRepository();
    const prop = await repo.create({ name: 'color' });
    const found = await repo.findById(prop.id);
    expect(found).toEqual(prop);
  });

  it('findByName returns correct property', async () => {
    const repo = new InMemoryPropertyRepository();
    await repo.create({ name: 'a' });
    await repo.create({ name: 'b' });
    const found = await repo.findByName('b');
    expect(found?.name).toBe('b');
  });

  it('delete removes property', async () => {
    const repo = new InMemoryPropertyRepository();
    const prop = await repo.create({ name: 'tmp' });
    await repo.delete(prop.id);
    expect(await repo.findById(prop.id)).toBeNull();
  });

  it('delete throws for missing id', async () => {
    const repo = new InMemoryPropertyRepository();
    await expect(repo.delete('nope')).rejects.toThrow('Property not found');
  });
});

describe('validateId', () => {
  it('throws for empty string', () => {
    expect(() => validateId('')).toThrow(RepositoryError);
  });

  it('throws for whitespace-only', () => {
    expect(() => validateId('   ')).toThrow(RepositoryError);
  });

  it('passes for valid id', () => {
    expect(() => validateId('abc-123')).not.toThrow();
  });
});

describe('validateRequired', () => {
  it('throws for empty string value', () => {
    expect(() => validateRequired({ email: '' })).toThrow(RepositoryError);
  });

  it('throws for null value', () => {
    expect(() => validateRequired({ name: null })).toThrow(RepositoryError);
  });

  it('throws for undefined value', () => {
    expect(() => validateRequired({ name: undefined })).toThrow(
      RepositoryError,
    );
  });

  it('passes for valid values', () => {
    expect(() =>
      validateRequired({ email: 'a@b.com', name: 'test' }),
    ).not.toThrow();
  });
});

describe('isTransientError', () => {
  it('returns true for connection errors', () => {
    expect(isTransientError(new Error('connection refused'))).toBe(true);
  });

  it('returns true for timeout errors', () => {
    expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('returns false for non-transient errors', () => {
    expect(isTransientError(new Error('invalid input'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isTransientError('string')).toBe(false);
  });
});

describe('wrapPrismaError', () => {
  it('wraps P2002 as DUPLICATE', () => {
    const err = new PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.0',
    });
    expect(() => wrapPrismaError(err)).toThrow(RepositoryError);
    try {
      wrapPrismaError(err);
    } catch (e) {
      expect((e as RepositoryError).code).toBe('DUPLICATE');
    }
  });

  it('wraps P2025 as NOT_FOUND', () => {
    const err = new PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: '6.0',
    });
    try {
      wrapPrismaError(err);
    } catch (e) {
      expect((e as RepositoryError).code).toBe('NOT_FOUND');
    }
  });

  it('wraps unknown Prisma codes as DATABASE_ERROR', () => {
    const err = new PrismaClientKnownRequestError('unknown', {
      code: 'P9999',
      clientVersion: '6.0',
    });
    try {
      wrapPrismaError(err);
    } catch (e) {
      expect((e as RepositoryError).code).toBe('DATABASE_ERROR');
    }
  });

  it('wraps plain Error as DATABASE_ERROR', () => {
    try {
      wrapPrismaError(new Error('oops'));
    } catch (e) {
      expect((e as RepositoryError).code).toBe('DATABASE_ERROR');
    }
  });
});

describe('withRetry', () => {
  it('returns on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    expect(await withRetry(fn, 2, 1)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient error then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValue('ok');
    expect(await withRetry(fn, 2, 1)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('connection refused'));
    await expect(withRetry(fn, 1, 1)).rejects.toThrow('connection refused');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-transient errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('bad input'));
    await expect(withRetry(fn, 3, 1)).rejects.toThrow('bad input');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
