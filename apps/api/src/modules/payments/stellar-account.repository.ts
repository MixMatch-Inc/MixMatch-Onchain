import { Inject, Injectable } from '@nestjs/common';
import type { StellarNetwork } from '@mixmatch/stellar';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../db/db.module';
import * as schema from '../../db/schema';
import type { Database } from '../../db/client';

export interface StellarAccountRecord {
  id: string;
  userId: string;
  publicKey: string;
  encryptedSecretKey: string;
  network: StellarNetwork;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class StellarAccountRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByUserId(userId: string): Promise<StellarAccountRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.stellarAccounts)
      .where(eq(schema.stellarAccounts.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<StellarAccountRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.stellarAccounts)
      .where(eq(schema.stellarAccounts.id, id))
      .limit(1);
    return row ?? null;
  }

  async create(input: {
    userId: string;
    publicKey: string;
    encryptedSecretKey: string;
    network: StellarNetwork;
  }): Promise<StellarAccountRecord> {
    const [row] = await this.db
      .insert(schema.stellarAccounts)
      .values(input)
      .returning();
    if (!row) {
      throw new Error('Failed to create Stellar account');
    }
    return row;
  }
}
