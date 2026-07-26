import { randomUUID } from 'node:crypto';
import { prisma } from '../../shared/database/prisma.js';
import type { User } from './users.types.js';
import {
  wrapPrismaError,
  withRetry,
  validateRequired,
  validateId,
} from '../../shared/database/repository-errors.js';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
}

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    validateRequired({ email });
    return withRetry(async () => {
      try {
        return await prisma.user.findUnique({ where: { email } });
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async findById(id: string): Promise<User | null> {
    validateId(id);
    return withRetry(async () => {
      try {
        return await prisma.user.findUnique({ where: { id } });
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async create(input: CreateUserInput): Promise<User> {
    validateRequired({ email: input.email, passwordHash: input.passwordHash });
    return withRetry(async () => {
      try {
        return await prisma.user.create({ data: { ...input, role: 'USER' } });
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    validateId(id);
    return withRetry(async () => {
      try {
        return await prisma.user.update({ where: { id }, data });
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const now = new Date();
    const user: User = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      role: 'USER',
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }
    const updated: User = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }
}
