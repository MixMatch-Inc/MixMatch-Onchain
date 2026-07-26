import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import { env } from './shared/config/env.js';
import { errorMiddleware } from './shared/middleware/error.middleware.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { rateLimit } from './modules/rate-limit/rate-limit.middleware.js';
import { requestLogger } from './middleware/logger.middleware.js';
import { logger } from './shared/logger/logger.js';
import { prisma } from './shared/database/prisma.js';

async function checkDatabase(): Promise<{ status: 'ok' | 'error'; latencyMs?: number; error?: string }> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : 'Unknown database error' };
  }
}

export async function getDetailedHealth(): Promise<Record<string, unknown>> {
  const [db] = await Promise.all([checkDatabase()]);
  const healthy = db.status === 'ok';
  return {
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    components: {
      database: db,
    },
  };
}

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.webOrigin }));
  app.use(express.json());
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/health/detailed', async (_req: Request, res: Response) => {
    try {
      const result = await getDetailedHealth();
      const statusCode = result.status === 'ok' ? 200 : 503;
      res.status(statusCode).json(result);
    } catch (err) {
      logger.error('Health check failed', err instanceof Error ? err : new Error(String(err)), { module: 'health' });
      res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
  });

  /*
   * Auth routes — see apps/docs/auth-guard.md for details on:
   *   - Role-based access control  (AuthGuard.requireRoles)
   *   - Self-ownership checks      (AuthGuard.requireOwnership)
   *   - Token verification         (requireAuth middleware)
   */
  app.use('/api/auth', rateLimit('auth'), createAuthRouter());

  app.use(errorMiddleware);

  return app;
}
