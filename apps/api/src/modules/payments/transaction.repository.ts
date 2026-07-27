import { randomUUID } from 'node:crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { prisma } from '../../shared/database/prisma.js';
import { validateId, validateRequired, withRetry, wrapPrismaError } from '../../shared/database/repository-errors.js';
import type { TransactionRecord, TransactionStatus } from './payments.types.js';

/** Thrown when a `create()` call reuses an `idempotencyKey` that already exists. */
export class DuplicateIdempotencyKeyError extends Error {
  constructor(public readonly idempotencyKey: string) {
    super(`A transaction with idempotency key "${idempotencyKey}" already exists`);
    this.name = 'DuplicateIdempotencyKeyError';
  }
}

export interface CreateTransactionInput {
  idempotencyKey: string;
  stellarAccountId: string;
  destinationPublicKey: string;
  amount: string;
  memo?: string;
}

export interface UpdateTransactionStatusInput {
  status: TransactionStatus;
  stellarTxHash?: string;
  failureCode?: string;
  failureReason?: string;
}

export interface TransactionPage {
  transactions: TransactionRecord[];
  total: number;
}

export interface TransactionRepository {
  findById(id: string): Promise<TransactionRecord | null>;
  findByIdempotencyKey(key: string): Promise<TransactionRecord | null>;
  /** @throws {DuplicateIdempotencyKeyError} if `input.idempotencyKey` is already in use. */
  create(input: CreateTransactionInput): Promise<TransactionRecord>;
  updateStatus(id: string, update: UpdateTransactionStatusInput): Promise<TransactionRecord>;
  listByStellarAccountId(stellarAccountId: string, page: number, limit: number): Promise<TransactionPage>;
  findStalePending(olderThan: Date): Promise<TransactionRecord[]>;
}

function toRecord(row: {
  id: string;
  idempotencyKey: string;
  stellarAccountId: string;
  destinationPublicKey: string;
  amount: string;
  memo: string | null;
  status: string;
  stellarTxHash: string | null;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TransactionRecord {
  return { ...row, status: row.status as TransactionStatus };
}

export class PrismaTransactionRepository implements TransactionRepository {
  async findById(id: string): Promise<TransactionRecord | null> {
    validateId(id);
    return withRetry(async () => {
      try {
        const row = await prisma.transaction.findUnique({ where: { id } });
        return row ? toRecord(row) : null;
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async findByIdempotencyKey(key: string): Promise<TransactionRecord | null> {
    validateRequired({ idempotencyKey: key });
    return withRetry(async () => {
      try {
        const row = await prisma.transaction.findUnique({ where: { idempotencyKey: key } });
        return row ? toRecord(row) : null;
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async create(input: CreateTransactionInput): Promise<TransactionRecord> {
    validateRequired({
      idempotencyKey: input.idempotencyKey,
      stellarAccountId: input.stellarAccountId,
      destinationPublicKey: input.destinationPublicKey,
      amount: input.amount,
    });
    try {
      const row = await prisma.transaction.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          stellarAccountId: input.stellarAccountId,
          destinationPublicKey: input.destinationPublicKey,
          amount: input.amount,
          memo: input.memo ?? null,
          status: 'PENDING',
        },
      });
      return toRecord(row);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateIdempotencyKeyError(input.idempotencyKey);
      }
      wrapPrismaError(error);
    }
  }

  async updateStatus(id: string, update: UpdateTransactionStatusInput): Promise<TransactionRecord> {
    validateId(id);
    return withRetry(async () => {
      try {
        const row = await prisma.transaction.update({
          where: { id },
          data: {
            status: update.status,
            stellarTxHash: update.stellarTxHash,
            failureCode: update.failureCode,
            failureReason: update.failureReason,
          },
        });
        return toRecord(row);
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async listByStellarAccountId(stellarAccountId: string, page: number, limit: number): Promise<TransactionPage> {
    validateId(stellarAccountId);
    return withRetry(async () => {
      try {
        const [rows, total] = await Promise.all([
          prisma.transaction.findMany({
            where: { stellarAccountId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.transaction.count({ where: { stellarAccountId } }),
        ]);
        return { transactions: rows.map(toRecord), total };
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async findStalePending(olderThan: Date): Promise<TransactionRecord[]> {
    return withRetry(async () => {
      try {
        const rows = await prisma.transaction.findMany({
          where: { status: 'PENDING', createdAt: { lt: olderThan } },
        });
        return rows.map(toRecord);
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }
}

export class InMemoryTransactionRepository implements TransactionRepository {
  private readonly byId = new Map<string, TransactionRecord>();
  private readonly byIdempotencyKey = new Map<string, string>();

  async findById(id: string): Promise<TransactionRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async findByIdempotencyKey(key: string): Promise<TransactionRecord | null> {
    const id = this.byIdempotencyKey.get(key);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async create(input: CreateTransactionInput): Promise<TransactionRecord> {
    if (this.byIdempotencyKey.has(input.idempotencyKey)) {
      throw new DuplicateIdempotencyKeyError(input.idempotencyKey);
    }
    const now = new Date();
    const record: TransactionRecord = {
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey,
      stellarAccountId: input.stellarAccountId,
      destinationPublicKey: input.destinationPublicKey,
      amount: input.amount,
      memo: input.memo ?? null,
      status: 'PENDING',
      stellarTxHash: null,
      failureCode: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    this.byIdempotencyKey.set(record.idempotencyKey, record.id);
    return record;
  }

  async updateStatus(id: string, update: UpdateTransactionStatusInput): Promise<TransactionRecord> {
    const existing = this.byId.get(id);
    if (!existing) {
      throw new Error(`Transaction not found: ${id}`);
    }
    const updated: TransactionRecord = {
      ...existing,
      status: update.status,
      stellarTxHash: update.stellarTxHash ?? existing.stellarTxHash,
      failureCode: update.failureCode ?? existing.failureCode,
      failureReason: update.failureReason ?? existing.failureReason,
      updatedAt: new Date(),
    };
    this.byId.set(id, updated);
    return updated;
  }

  async listByStellarAccountId(stellarAccountId: string, page: number, limit: number): Promise<TransactionPage> {
    const all = [...this.byId.values()]
      .filter((tx) => tx.stellarAccountId === stellarAccountId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * limit;
    return { transactions: all.slice(start, start + limit), total: all.length };
  }

  async findStalePending(olderThan: Date): Promise<TransactionRecord[]> {
    return [...this.byId.values()].filter((tx) => tx.status === 'PENDING' && tx.createdAt < olderThan);
  }
}
