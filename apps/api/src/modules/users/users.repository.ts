import { randomUUID } from 'node:crypto';
import { prisma } from '../../shared/database/prisma.js';
import type { User } from './users.types.js';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

=======
export interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
}

>>>>>>> pr647/feat/phertyameen-issues
/**
 * Data access for the `users` table. The auth module is the only consumer
 * of this repository for now; it exists in `modules/users` because the
 * underlying table may be shared by future modules.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
<<<<<<< HEAD
update(id: string, data: UpdateUserInput): Promise<User>;
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
return prisma.user.create({ data: { ...input, role: 'USER' } });
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
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
=======
      role: 'USER',
>>>>>>> pr647/feat/phertyameen-issues
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }
<<<<<<< HEAD
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
