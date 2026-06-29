import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../logger/logger.js';
import type { AuthErrorResponse } from '@mixmatch/shared';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: { error: AuthErrorResponse } = {
      error: { code: err.code as AuthErrorResponse['code'], message: err.message },
    };
    if ('retryAfter' in err && typeof (err as Record<string, unknown>).retryAfter === 'number') {
      body.error.retryAfter = (err as Record<string, unknown>).retryAfter as number;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  logger.error('Unhandled error', { error: err instanceof Error ? err.stack : err });
  res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' } });
}
