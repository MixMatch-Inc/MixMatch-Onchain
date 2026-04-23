import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export interface RequestContext {
  correlationId: string;
  actor?: {
    userId: string;
    role: string;
  };
  blindMode: boolean;
  clientPlatform: string;
  timestamp: Date;
}

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

export const contextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = req.header('x-correlation-id') || randomUUID();
  const blindMode = req.header('x-blind-mode') === 'true' || false;
  const clientPlatform = req.header('x-client-platform') || 'web';

  req.context = {
    correlationId,
    actor: req.user ? {
      userId: req.user.userId,
      role: req.user.role,
    } : undefined,
    blindMode,
    clientPlatform,
    timestamp: new Date(),
  };

  // Set correlation ID in response headers for client
  res.setHeader('x-correlation-id', correlationId);

  next();
};