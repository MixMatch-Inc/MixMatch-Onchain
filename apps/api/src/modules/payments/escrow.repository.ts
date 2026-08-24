import { Inject, Injectable } from '@nestjs/common';
import type { EscrowStatus } from '@mixmatch/shared';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../db/db.module';
import * as schema from '../../db/schema';
import type { Database } from '../../db/client';

export class DuplicateEscrowIdempotencyKeyError extends Error {
  constructor(public readonly idempotencyKey: string) {
    super(`An escrow with idempotency key "${idempotencyKey}" already exists`);
    this.name = 'DuplicateEscrowIdempotencyKeyError';
  }
}

export interface EscrowRecord {
  id: string;
  idempotencyKey: string;
  payerStellarAccountId: string;
  payeePublicKey: string;
  tokenContractId: string;
  amount: string;
  onChainEscrowId: string | null;
  timeoutLedger: number | null;
  status: EscrowStatus;
  depositTxHash: string | null;
  finalizeTxHash: string | null;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class EscrowRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<EscrowRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.escrows)
      .where(eq(schema.escrows.id, id))
      .limit(1);
    return row ?? null;
  }

  async findByIdempotencyKey(key: string): Promise<EscrowRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.escrows)
      .where(eq(schema.escrows.idempotencyKey, key))
      .limit(1);
    return row ?? null;
  }

  async create(input: {
    idempotencyKey: string;
    payerStellarAccountId: string;
    payeePublicKey: string;
    tokenContractId: string;
    amount: string;
  }): Promise<EscrowRecord> {
    try {
      const [row] = await this.db
        .insert(schema.escrows)
        .values({ ...input, status: 'PENDING' })
        .returning();
      if (!row) {
        throw new Error('Failed to create escrow');
      }
      return row;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateEscrowIdempotencyKeyError(input.idempotencyKey);
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    update: {
      status: EscrowStatus;
      onChainEscrowId?: string;
      timeoutLedger?: number;
      depositTxHash?: string;
      finalizeTxHash?: string;
      failureCode?: string;
      failureReason?: string;
    },
  ): Promise<EscrowRecord> {
    const [row] = await this.db
      .update(schema.escrows)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(schema.escrows.id, id))
      .returning();
    if (!row) {
      throw new Error(`Escrow not found: ${id}`);
    }
    return row;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === UNIQUE_VIOLATION_CODE
  );
}
