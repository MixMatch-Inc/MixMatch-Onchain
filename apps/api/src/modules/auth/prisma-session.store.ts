import { prisma } from '../../shared/database/prisma.js';
import type { SessionStore } from './session.store.js';
import type { Session } from './session.types.js';

export class PrismaSessionStore implements SessionStore {
  async create(session: Session): Promise<void> {
    await prisma.session.create({
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
    const session = await prisma.session.findUnique({
      where: { refreshToken: hash },
    });
    if (!session) return null;
    return {
      id: session.id,
      userId: session.userId,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }

  async delete(id: string): Promise<void> {
    await prisma.session.delete({ where: { id } }).catch(() => {});
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
  }

  async countByUserId(userId: string): Promise<number> {
    return prisma.session.count({ where: { userId } });
  }

  async cleanupExpired(): Promise<void> {
    await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
