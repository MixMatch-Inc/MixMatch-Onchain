import { Inject, Injectable } from '@nestjs/common';
import type {
  AnchorTransactionKind,
  AnchorTransactionStatus,
} from '@mixmatch/shared';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { DATABASE } from '../../db/db.module';
import * as schema from '../../db/schema';
import type { Database } from '../../db/client';

export interface AnchorTransactionRecord {
  id: string;
  stellarAccountId: string;
  kind: AnchorTransactionKind;
  assetCode: string;
  homeDomain: string;
  sep24TransactionId: string;
  status: AnchorTransactionStatus;
  interactiveUrl: string | null;
  moreInfoUrl: string | null;
  amountIn: string | null;
  amountOut: string | null;
  stellarTransactionId: string | null;
  externalTransactionId: string | null;
  message: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnchorTransactionPage {
  transactions: AnchorTransactionRecord[];
  total: number;
}

@Injectable()
export class AnchorTransactionRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<AnchorTransactionRecord | null> {
    const [row] = await this.db
      .select()
      .from(schema.anchorTransactions)
      .where(eq(schema.anchorTransactions.id, id))
      .limit(1);
    return row ?? null;
  }

  async create(input: {
    stellarAccountId: string;
    kind: AnchorTransactionKind;
    assetCode: string;
    homeDomain: string;
    sep24TransactionId: string;
    status: AnchorTransactionStatus;
    interactiveUrl?: string;
    moreInfoUrl?: string;
    amountIn?: string;
    amountOut?: string;
    stellarTransactionId?: string;
    externalTransactionId?: string;
    message?: string;
    startedAt: Date;
    completedAt?: Date;
  }): Promise<AnchorTransactionRecord> {
    const [row] = await this.db
      .insert(schema.anchorTransactions)
      .values(input)
      .returning();
    if (!row) {
      throw new Error('Failed to create anchor transaction');
    }
    return row;
  }

  async updateFromAnchor(
    id: string,
    update: {
      status: AnchorTransactionStatus;
      amountIn?: string;
      amountOut?: string;
      stellarTransactionId?: string;
      externalTransactionId?: string;
      message?: string;
      completedAt?: Date;
    },
  ): Promise<AnchorTransactionRecord> {
    const [row] = await this.db
      .update(schema.anchorTransactions)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(schema.anchorTransactions.id, id))
      .returning();
    if (!row) {
      throw new Error(`Anchor transaction not found: ${id}`);
    }
    return row;
  }

  async listByStellarAccountId(
    stellarAccountId: string,
    page: number,
    limit: number,
  ): Promise<AnchorTransactionPage> {
    const offset = (page - 1) * limit;
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.anchorTransactions)
        .where(eq(schema.anchorTransactions.stellarAccountId, stellarAccountId))
        .orderBy(desc(schema.anchorTransactions.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(schema.anchorTransactions)
        .where(
          eq(schema.anchorTransactions.stellarAccountId, stellarAccountId),
        ),
    ]);
    return { transactions: rows, total };
  }

  /** All transactions belonging to `stellarAccountId` still in an in-progress SEP-24 status — used to opportunistically re-poll on status/history reads. */
  async findInProgressByStellarAccountId(
    stellarAccountId: string,
    inProgressStatuses: AnchorTransactionStatus[],
  ): Promise<AnchorTransactionRecord[]> {
    return this.db
      .select()
      .from(schema.anchorTransactions)
      .where(
        and(
          eq(schema.anchorTransactions.stellarAccountId, stellarAccountId),
          inArray(schema.anchorTransactions.status, inProgressStatuses),
        ),
      );
  }
}
