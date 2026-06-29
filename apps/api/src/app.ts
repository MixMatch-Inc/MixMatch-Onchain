import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './shared/config/env.js';
import { errorMiddleware } from './shared/middleware/error.middleware.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { rateLimit } from './modules/rate-limit/rate-limit.middleware.js';
import { requestLogger } from './middleware/logger.middleware.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.webOrigin }));
  app.use(express.json());
  // Add request logging first to capture all incoming requests
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
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