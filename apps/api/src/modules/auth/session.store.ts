import { PrismaClient } from '@prisma/client';
import type { Session } from './session.types.js';

export interface SessionStore {
  create(session: Session): Promise<void>;
  findByRefreshTokenHash(hash: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  deleteAllByUserId(userId: string): Promise<void>;
  countByUserId(userId: string): Promise<number>;
  cleanupExpired(): Promise<void>;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();
  private readonly hashIndex = new Map<string, string>();

  async create(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
    this.hashIndex.set(session.refreshToken, session.id);
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    const sessionId = this.hashIndex.get(hash);
    if (!sessionId) return null;
    return this.sessions.get(sessionId) ?? null;
  }

  async delete(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      this.hashIndex.delete(session.refreshToken);
      this.sessions.delete(id);
    }
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    const toDelete: string[] = [];
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      await this.delete(id);
    }
  }

  async countByUserId(userId: string): Promise<number> {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId) count++;
    }
    return count;
  }

  async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const toDelete: string[] = [];
    for (const [id, session] of this.sessions) {
      if (new Date(session.expiresAt).getTime() < now) {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      await this.delete(id);
    }
  }
}

export class PrismaSessionStore implements SessionStore {
  constructor(private readonly prisma: PrismaClient) {}

  async create(session: Session): Promise<void> {
    await this.prisma.session.create({
      data: {
        id: session.id,
        userId: session.userId,
        refreshToken: session.refreshToken,
        expiresAt: new Date(session.expiresAt),
        createdAt: new Date(session.createdAt),
      },
    });
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    const record = await this.prisma.session.findUnique({
      where: { refreshToken: hash },
    });
    if (!record) return null;
    return {
      id: record.id,
      userId: record.userId,
      refreshToken: record.refreshToken,
      expiresAt: record.expiresAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
    };
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.session.delete({ where: { id } });
    } catch {
      // record already removed — idempotent by design
    }
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.session.count({ where: { userId } });
  }

  async cleanupExpired(): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
