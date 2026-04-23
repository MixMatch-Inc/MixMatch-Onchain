import { NextFunction, Request, Response } from 'express';

export interface StellarRequestContext {
  correlationId: string;
  actorId?: string;
  actorRole?: string;
  blindMode: boolean;
  clientPlatform: string;
}

declare global {
  namespace Express {
    interface Request {
      stellarContext: StellarRequestContext;
    }
  }
}

export const stellarContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = req.header('x-correlation-id') || 'unknown';
  const actorId = req.header('x-actor-id') || undefined;
  const actorRole = req.header('x-actor-role') || undefined;
  const blindMode = req.header('x-blind-mode') === 'true';
  const clientPlatform = req.header('x-client-platform') || 'unknown';

  req.stellarContext = {
    correlationId,
    actorId,
    actorRole,
    blindMode,
    clientPlatform,
  };

  next();
};