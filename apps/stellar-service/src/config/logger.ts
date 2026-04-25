import type { Request } from 'express';
import { createLogger } from '@mixmatch/logger';
import { stellarEnv } from './env';

export const stellarLogger = createLogger({
  serviceName: 'stellar-service',
  level: stellarEnv.logLevel as 'debug' | 'info' | 'warn' | 'error',
  environment: stellarEnv.nodeEnv,
});

export const getStellarRequestLogger = (req: Request) =>
  stellarLogger.child({
    correlationId: req.stellarContext?.correlationId,
    actorId: req.stellarContext?.actorId,
    actorRole: req.stellarContext?.actorRole,
    blindMode: req.stellarContext?.blindMode,
    clientPlatform: req.stellarContext?.clientPlatform,
  });
