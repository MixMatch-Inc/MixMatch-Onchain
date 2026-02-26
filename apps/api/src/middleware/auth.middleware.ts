import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@mixmatch/types';
import {
  JsonWebTokenError,
  TokenExpiredError,
  verifyToken,
} from '../services/jwt.service';

export interface AuthenticatedRequestUser {
  userId: string;
  role: UserRole;
}

const extractBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractBearerToken(req.header('authorization'));

  if (!token) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
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
      res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
      return;
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: insufficient role permissions' });
      return;
    }

    next();
  };
};
