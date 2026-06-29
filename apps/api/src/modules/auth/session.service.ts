import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../shared/config/env.js';
import { InvalidRefreshTokenError } from '../../shared/errors/AuthErrors.js';
import { logger } from '../../utils/logger.js';
import type { SessionStore } from './session.store.js';
import { SESSION_CONFIG } from './session.types.js';

const REFRESH_TOKEN_EXPIRY_MS = SESSION_CONFIG.refreshTokenExpiryMs;
const MAX_ACTIVE_SESSIONS = SESSION_CONFIG.maxActiveSessions;

export class SessionService {
  constructor(private readonly sessionStore: SessionStore) {}

  async createSession(userId: string) {
    const activeCount = await this.sessionStore.countByUserId(userId);
    if (activeCount >= MAX_ACTIVE_SESSIONS) {
      throw new InvalidRefreshTokenError('Maximum active sessions reached');
    }

    const id = randomUUID();
    const refreshToken = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_MS);

    await this.sessionStore.create({
      id,
      userId,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    });

    const accessToken = jwt.sign({ sub: userId }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    } as jwt.SignOptions);

    logger.info('New session created successfully', {
      module: 'auth',
      userId,
      sessionId: id,
      expiresAt: expiresAt.toISOString(),
    });

    return { accessToken, refreshToken };
  }

  async refreshSession(refreshToken: string) {
    if (!refreshToken) {
      throw new InvalidRefreshTokenError('Refresh token is required');
    }

    const session = await this.sessionStore.findByRefreshTokenHash(refreshToken);
    if (!session) {
      throw new InvalidRefreshTokenError();
    }

    if (new Date(session.expiresAt) < new Date()) {
      await this.sessionStore.delete(session.id);
      throw new InvalidRefreshTokenError('Refresh token has expired');
    }

    await this.sessionStore.delete(session.id);

    const newRefreshToken = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_MS);

    await this.sessionStore.create({
      id: randomUUID(),
      userId: session.userId,
      refreshToken: newRefreshToken,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    });

    const accessToken = jwt.sign({ sub: session.userId }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    } as jwt.SignOptions);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async revokeSession(refreshToken: string) {
    const session = await this.sessionStore.findByRefreshTokenHash(refreshToken);
    if (!session) {
      throw new InvalidRefreshTokenError('Session not found');
    }
    await this.sessionStore.delete(session.id);
  }

  async revokeAllUserSessions(userId: string) {
    await this.sessionStore.deleteAllByUserId(userId);
  }
}