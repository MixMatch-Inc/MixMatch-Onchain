import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/AppError.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

interface AccessTokenPayload {
  sub: string;
}

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the
 * authenticated user's id to `req.userId`. Intended for protecting routes
 * that require a logged-in user.
 */
export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
    req.userId = payload.sub;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
