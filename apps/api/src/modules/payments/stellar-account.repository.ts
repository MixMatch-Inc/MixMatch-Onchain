import { randomUUID } from 'node:crypto';
import type { StellarNetwork } from '@mixmatch/stellar';
import { prisma } from '../../shared/database/prisma.js';
import { validateId, validateRequired, withRetry, wrapPrismaError } from '../../shared/database/repository-errors.js';
import type { StellarAccountRecord } from './payments.types.js';

export interface CreateStellarAccountInput {
  userId: string;
  publicKey: string;
  encryptedSecretKey: string;
  network: StellarNetwork;
}

export interface StellarAccountRepository {
  findByUserId(userId: string): Promise<StellarAccountRecord | null>;
  findById(id: string): Promise<StellarAccountRecord | null>;
  create(input: CreateStellarAccountInput): Promise<StellarAccountRecord>;
}

function toRecord(row: {
  id: string;
  userId: string;
  publicKey: string;
  encryptedSecretKey: string;
  network: string;
  createdAt: Date;
  updatedAt: Date;
}): StellarAccountRecord {
  return { ...row, network: row.network as StellarNetwork };
}

export class PrismaStellarAccountRepository implements StellarAccountRepository {
  async findByUserId(userId: string): Promise<StellarAccountRecord | null> {
    validateId(userId);
    return withRetry(async () => {
      try {
        const row = await prisma.stellarAccount.findUnique({ where: { userId } });
        return row ? toRecord(row) : null;
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async findById(id: string): Promise<StellarAccountRecord | null> {
    validateId(id);
    return withRetry(async () => {
      try {
        const row = await prisma.stellarAccount.findUnique({ where: { id } });
        return row ? toRecord(row) : null;
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }

  async create(input: CreateStellarAccountInput): Promise<StellarAccountRecord> {
    validateRequired({
      userId: input.userId,
      publicKey: input.publicKey,
      encryptedSecretKey: input.encryptedSecretKey,
    });
    return withRetry(async () => {
      try {
        const row = await prisma.stellarAccount.create({ data: input });
        return toRecord(row);
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }
}

export class InMemoryStellarAccountRepository implements StellarAccountRepository {
  private readonly byId = new Map<string, StellarAccountRecord>();
  private readonly byUserId = new Map<string, string>();

  async findByUserId(userId: string): Promise<StellarAccountRecord | null> {
    const id = this.byUserId.get(userId);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async findById(id: string): Promise<StellarAccountRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async create(input: CreateStellarAccountInput): Promise<StellarAccountRecord> {
    const now = new Date();
    const record: StellarAccountRecord = {
      id: randomUUID(),
      userId: input.userId,
      publicKey: input.publicKey,
      encryptedSecretKey: input.encryptedSecretKey,
      network: input.network,
      createdAt: now,
      updatedAt: now,
    };
    this.byId.set(record.id, record);
    this.byUserId.set(record.userId, record.id);
    return record;
  }
}
