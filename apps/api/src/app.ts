import express from 'express';
import cors from 'cors';
import authRouter from './modules/auth/auth.routes';
import healthRouter from './modules/health/health.routes';
import { requestLogger } from './middleware/logger.middleware';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.use('/auth', authRouter);
  app.use('/health', healthRouter);

  return app;
};
