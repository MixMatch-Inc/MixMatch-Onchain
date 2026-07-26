import cors from 'cors';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { env } from './shared/config/env.js';
import { ValidationError } from './shared/errors/AppError.js';
import { errorMiddleware } from './shared/middleware/error.middleware.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createPaymentsRouter } from './modules/payments/payments.routes.js';
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

  // Halt on oversized bodies before they reach any route handler.
  app.use(express.json({ limit: '100kb' }));

  // Structured error for malformed JSON — avoids an opaque 500 from Express.
  app.use(
    (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
      if (
        err instanceof SyntaxError &&
        'status' in err &&
        (err as { status: number }).status === 400 &&
        'body' in err
      ) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON in request body' },
        });
        return;
      }
      next(err);
    },
  );

  // Per-request timeout — kills long-running handlers before they exhaust resources.
  app.use((_req: Request, res: Response, next: NextFunction): void => {
    const TIMEOUT_MS = 30_000;
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: { code: 'GATEWAY_TIMEOUT', message: 'Request timed out' },
        });
      }
    }, TIMEOUT_MS);
    res.on('finish', () => clearTimeout(timer));
    next();
  });

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

  // Payment routes — see apps/api/src/modules/payments/README.md for the
  // account-provisioning, idempotency, and reconciliation model.
  app.use('/api/payments', createPaymentsRouter());

  // Catch-all: every request that reaches here has no matching route.
  app.use((_req: Request, res: Response) => {
    if (!res.headersSent) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist' },
      });
    }
  });

  app.use(errorMiddleware);

  return app;
}
