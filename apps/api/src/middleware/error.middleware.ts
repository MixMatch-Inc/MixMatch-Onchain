import { NextFunction, Request, Response } from 'express';

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const message = error instanceof Error ? error.message : 'Internal server error';

  res.status(500).json({
    message,
  });
};
