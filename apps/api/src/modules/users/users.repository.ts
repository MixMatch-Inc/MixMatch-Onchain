import { randomUUID } from 'node:crypto';
import { prisma } from '../../shared/database/prisma.js';
import type { User } from './users.types.js';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

/**
 * Data access for the `users` table. The auth module is the only consumer
 * of this repository for now; it exists in `modules/users` because the
 * underlying table may be shared by future modules.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
}

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<User> {
    return prisma.user.create({ data: input });
  }
}

/**
 * In-memory implementation used by tests so the auth module's test suite
 * runs without a database connection.
 */
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
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }
}
