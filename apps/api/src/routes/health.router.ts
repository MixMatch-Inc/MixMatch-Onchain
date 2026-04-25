import { Router } from 'express';
import mongoose from 'mongoose';

const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

healthRouter.get('/ready', (_req, res) => {
  const state = mongoose.connection.readyState;
  // 1 = connected
  if (state === 1) {
    res.json({ status: 'ready', mongo: 'connected' });
  } else {
    res.status(503).json({ status: 'not ready', mongo: 'disconnected' });
  }
});

export default healthRouter;
