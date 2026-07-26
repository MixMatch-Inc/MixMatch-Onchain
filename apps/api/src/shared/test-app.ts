import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { rateLimit } from '../modules/rate-limit/rate-limit.middleware.js';
import { requestLogger } from '../middleware/logger.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';

/**
 * Create an Express app configured for testing.
 *
 * Uses a lightweight wiring identical to the production `createApp()` but
 * relies on the test database (DATABASE_URL env var) rather than reading
 * production configuration.  This keeps the test harness isolated from
 * env.ts validation while still exercising the real middleware stack.
 */
export function createTestApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/health/detailed', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', rateLimit('auth'), createAuthRouter());

  app.use(errorMiddleware);

  return app;
}
