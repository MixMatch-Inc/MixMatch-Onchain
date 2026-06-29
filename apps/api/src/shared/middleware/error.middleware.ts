import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger/logger.js';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  logger.error('Unhandled error', { error: err instanceof Error ? err.stack : err });
  res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' } });
}
