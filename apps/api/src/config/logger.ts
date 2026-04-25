import type { Request } from 'express';
import { createLogger } from '@mixmatch/logger';
import { apiEnv } from './env';

export const apiLogger = createLogger({
  serviceName: 'api',
  level: apiEnv.logLevel as 'debug' | 'info' | 'warn' | 'error',
  environment: apiEnv.nodeEnv,
});

export const getApiRequestLogger = (req: Request) =>
  apiLogger.child({
    correlationId: req.context?.correlationId,
    actorId: req.context?.actor?.userId,
    actorRole: req.context?.actor?.role,
    blindMode: req.context?.blindMode,
    clientPlatform: req.context?.clientPlatform,
  });
