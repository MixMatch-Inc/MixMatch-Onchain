import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@mixmatch/types';
import {
  JsonWebTokenError,
  TokenExpiredError,
  verifyToken,
} from '../services/jwt.service';
import { extractBearerToken } from '../utils/session-guard';
import { jwtUnauthorizedError } from '../utils/session-errors';

export interface AuthenticatedRequestUser {
  userId: string;
  role: UserRole;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req.header('authorization'));

  if (!token) {
    next(jwtUnauthorizedError());
    return;
  }

  try {
    const payload = verifyToken(token);

    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
      next(jwtUnauthorizedError());
      return;
    }

    next(error);
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(jwtUnauthorizedError());
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: insufficient role permissions' });
      return;
    }

    next();
  };
};
