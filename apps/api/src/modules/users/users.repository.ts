import { Inject, Injectable } from '@nestjs/common';
import type { UserRole } from '@mixmatch/shared';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../db/db.module';
import * as schema from '../../db/schema';
import type { Database } from '../../db/client';

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  role: UserRole;
  /** Null until the address is confirmed via `POST /auth/verify-email`. */
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return row ?? null;
  }

  async create(input: { email: string; passwordHash: string }): Promise<User> {
    const [row] = await this.db.insert(schema.users).values(input).returning();
    if (!row) {
      throw new Error('Failed to create user');
    }
    return row;
  }

  /** Records the address as confirmed. Idempotent: re-verifying is a no-op. */
  async markEmailVerified(id: string): Promise<User> {
    const now = new Date();
    const [row] = await this.db
      .update(schema.users)
      .set({ emailVerifiedAt: now, updatedAt: now })
      .where(eq(schema.users.id, id))
      .returning();
    if (!row) {
      throw new Error(`Failed to mark user ${id} as email-verified`);
    }
    return row;
  }
}
