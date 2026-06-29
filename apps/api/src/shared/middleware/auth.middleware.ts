import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { InvalidTokenError, TokenExpiredError } from '../errors/AuthErrors.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
import { InvalidTokenError, TokenExpiredError } from '../errors/AuthErrors.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
>>>>>>> pr648/feat/Maryermarh-issues
  role?: string;
}

interface AccessTokenPayload {
  sub: string;
<<<<<<< HEAD
=======
  role?: string;
=======
  role?: string;
>>>>>>> pr648/feat/Maryermarh-issues
}

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the
 * authenticated user's id to `req.userId`. Intended for protecting routes
 * that require a logged-in user.
 */
export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
<<<<<<< HEAD
    throw new UnauthorizedError('Missing or invalid Authorization header');
throw new InvalidTokenError('Missing or invalid Authorization header');
throw new InvalidTokenError('Missing or invalid Authorization header');
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
    req.userId = payload.sub;
next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
req.role = payload.role ?? 'USER';
req.role = payload.role ?? 'USER';
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError();
  }
}
