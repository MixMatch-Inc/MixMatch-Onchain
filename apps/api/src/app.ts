import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './shared/config/env.js';
import { errorMiddleware } from './shared/middleware/error.middleware.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.webOrigin }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/auth', createAuthRouter());

  app.use(errorMiddleware);

  return app;
}
