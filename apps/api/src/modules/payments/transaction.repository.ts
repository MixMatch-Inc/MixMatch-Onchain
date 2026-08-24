import { Inject, Injectable } from '@nestjs/common';
import type { TransactionStatus } from '@mixmatch/shared';
import { and, count, desc, eq, lt } from 'drizzle-orm';
import { DATABASE } from '../../db/db.module';
import * as schema from '../../db/schema';
import type { Database } from '../../db/client';

export class DuplicateIdempotencyKeyError extends Error {
  constructor(public readonly idempotencyKey: string) {
    super(
      `A transaction with idempotency key "${idempotencyKey}" already exists`,
    );
    this.name = 'DuplicateIdempotencyKeyError';
  }
}

export interface TransactionRecord {
  id: string;
  idempotencyKey: string;
  stellarAccountId: string;
  destinationPublicKey: string;
  amount: string;
  memo: string | null;
  /** Null means native XLM. */
  assetCode: string | null;
  /** Null means native XLM. */
  assetIssuer: string | null;
  status: TransactionStatus;
  stellarTxHash: string | null;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionPage {
  transactions: TransactionRecord[];
  total: number;
}

const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class TransactionRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<TransactionRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);
    return row ?? null;
  }

  async findByIdempotencyKey(key: string): Promise<TransactionRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.idempotencyKey, key))
      .limit(1);
    return row ?? null;
  }

  async create(input: {
    idempotencyKey: string;
    stellarAccountId: string;
    destinationPublicKey: string;
    amount: string;
    memo?: string;
    assetCode?: string;
    assetIssuer?: string;
  }): Promise<TransactionRecord> {
    try {
      const [row] = await this.db
        .insert(schema.transactions)
        .values({
          ...input,
          memo: input.memo ?? null,
          assetCode: input.assetCode ?? null,
          assetIssuer: input.assetIssuer ?? null,
          status: 'PENDING',
        })
        .returning();
      if (!row) {
        throw new Error('Failed to create transaction');
      }
      return row;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateIdempotencyKeyError(input.idempotencyKey);
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    update: {
      status: TransactionStatus;
      stellarTxHash?: string;
      failureCode?: string;
      failureReason?: string;
    },
  ): Promise<TransactionRecord> {
    const [row] = await this.db
      .update(schema.transactions)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(schema.transactions.id, id))
      .returning();
    if (!row) {
      throw new Error(`Transaction not found: ${id}`);
    }
    return row;
  }

  async listByStellarAccountId(
    stellarAccountId: string,
    page: number,
    limit: number,
  ): Promise<TransactionPage> {
    const offset = (page - 1) * limit;
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.stellarAccountId, stellarAccountId))
        .orderBy(desc(schema.transactions.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.transactions)
        .where(eq(schema.transactions.stellarAccountId, stellarAccountId)),
    ]);
    return { transactions: rows, total };
  }

  async findStalePending(olderThan: Date): Promise<TransactionRecord[]> {
    return this.db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.status, 'PENDING'),
          lt(schema.transactions.createdAt, olderThan),
        ),
      );
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
