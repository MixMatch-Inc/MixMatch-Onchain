import { Request } from 'express';
import { getStellarRequestLogger } from '../config/logger';

export const createLogger = (req: Request) => ({
  info: (message: string, extra?: Record<string, unknown>) => {
    getStellarRequestLogger(req).info(message, extra);
  },
  error: (message: string, error?: unknown) => {
    getStellarRequestLogger(req).error(message, { error });
  },
  warn: (message: string, extra?: Record<string, unknown>) => {
    getStellarRequestLogger(req).warn(message, extra);
  },
});
