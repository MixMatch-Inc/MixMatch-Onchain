import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../db/db.module';
import * as schema from '../../db/schema';
import type { Database } from '../../db/client';

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
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
}
