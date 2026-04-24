import { RequestContext } from '../middleware/context.middleware';

export const getLogContext = (context: RequestContext) => ({
  correlationId: context.correlationId,
  actorId: context.actor?.userId,
  actorRole: context.actor?.role,
  blindMode: context.blindMode,
  clientPlatform: context.clientPlatform,
});

export const getAsyncJobContext = (context: RequestContext) => ({
  correlationId: context.correlationId,
  actor: context.actor,
  blindMode: context.blindMode,
  clientPlatform: context.clientPlatform,
  timestamp: context.timestamp.toISOString(),
});

export const getPropagationHeaders = (context: RequestContext) => ({
  'x-correlation-id': context.correlationId,
  'x-actor-id': context.actor?.userId || '',
  'x-actor-role': context.actor?.role || '',
  'x-blind-mode': context.blindMode.toString(),
  'x-client-platform': context.clientPlatform,
});