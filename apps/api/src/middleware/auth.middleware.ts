import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@mixmatch/types';
import {
  JsonWebTokenError,
  TokenExpiredError,
  verifyToken,
} from '../services/jwt.service';
import { container } from '../config/di';

export interface AuthenticatedRequestUser {
  id: string;
  userId: string;
  role: UserRole;
  sessionId?: string;
  iat?: number;
  exp?: number;
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

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = extractBearerToken(req.header('authorization'));

  if (!token) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  try {
    const payload = verifyToken(token);

    if (payload.sessionId) {
      const session = await container.sessionRepository.findSessionById(payload.sessionId, payload.userId);
      if (!session) {
        res.status(401).json({ message: 'Unauthorized: session revoked or expired' });
        return;
      }
    }

    req.user = {
      id: payload.userId,
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
      iat: payload.iat,
      exp: payload.exp,
    };
    if (req.context) {
      req.context.actor = {
        userId: payload.userId,
        role: payload.role,
      };
    }

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
