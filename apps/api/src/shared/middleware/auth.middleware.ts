import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { InvalidTokenError, TokenExpiredError } from '../errors/AuthErrors.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  role?: string;
}

interface AccessTokenPayload {
  sub: string;
  role?: string;
}

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the
 * authenticated user's id to `req.userId`. Intended for protecting routes
 * that require a logged-in user.
 */
export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new InvalidTokenError('Missing or invalid Authorization header');
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
    req.userId = payload.sub;
    req.role = payload.role ?? 'USER';
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError();
  }
}
