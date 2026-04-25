import type { Request, Response } from 'express';
import {
  MemoryRateLimitStore,
  createRateLimitMiddleware,
  getOrCreateRegistry,
  registerMixMatchTelemetry,
} from '@mixmatch/observability';
import { apiEnv } from './env';

const SERVICE_NAME = 'api';

export const apiMetricsRegistry = getOrCreateRegistry('mixmatch-api');
export const apiTelemetry = registerMixMatchTelemetry(apiMetricsRegistry);

apiTelemetry.websocketConnections.set({ service: SERVICE_NAME }, 0);
apiTelemetry.outboxBacklog.set({ service: SERVICE_NAME, queue: 'default' }, 0);

const isInternalRequest = (req: Request): boolean => {
  if (req.header('x-internal-service-call') === 'true') {
    return true;
  }

  const secret = apiEnv.internalServiceSecret;
  return Boolean(secret && req.header('x-mixmatch-service-secret') === secret);
};

const rateLimitStore = new MemoryRateLimitStore();

export const apiRateLimitMiddleware = createRateLimitMiddleware({
  store: rateLimitStore,
  rules: [
    {
      name: 'auth',
      windowMs: 60_000,
      max: 8,
      match: (req) => req.path.startsWith('/auth'),
      skip: isInternalRequest,
    },
    {
      name: 'impression-ingestion',
      windowMs: 60_000,
      max: 20,
      match: (req) => req.path === '/discover/impressions',
      skip: isInternalRequest,
    },
    {
      name: 'track-resolution',
      windowMs: 60_000,
      max: 15,
      match: (req) =>
        req.path.startsWith('/payments/stellar') ||
        req.path.startsWith('/taste-signals'),
      skip: isInternalRequest,
    },
    {
      name: 'discovery-read',
      windowMs: 60_000,
      max: 60,
      match: (req) => req.method === 'GET' && req.path.startsWith('/discover'),
      skip: isInternalRequest,
    },
  ],
});

export const metricsHandler = (_req: Request, res: Response): void => {
  res.type('text/plain').send(apiMetricsRegistry.renderPrometheus());
};

export const isMetricsAuthorized = (req: Request): boolean => {
  const metricsToken = apiEnv.metricsAuthToken;

  if (metricsToken && req.header('authorization') === `Bearer ${metricsToken}`) {
    return true;
  }

  return isInternalRequest(req);
};

export const recordProviderCall = async <T>(
  provider: string,
  operation: string,
  callback: () => Promise<T>,
): Promise<T> => {
  const startedAt = Date.now();

  try {
    const result = await callback();
    const durationMs = Date.now() - startedAt;

    apiTelemetry.providerCallsTotal.inc({
      service: SERVICE_NAME,
      provider,
      operation,
      outcome: 'success',
    });
    apiTelemetry.providerCallDurationMs.observe(
      {
        service: SERVICE_NAME,
        provider,
        operation,
        outcome: 'success',
      },
      durationMs,
    );

    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    apiTelemetry.providerCallsTotal.inc({
      service: SERVICE_NAME,
      provider,
      operation,
      outcome: 'error',
    });
    apiTelemetry.providerCallDurationMs.observe(
      {
        service: SERVICE_NAME,
        provider,
        operation,
        outcome: 'error',
      },
      durationMs,
    );

    throw error;
  }
};

export const observeRequestMetrics = (
  req: Request,
  res: Response,
  durationMs: number,
): void => {
  const route =
    req.baseUrl && req.route?.path ? `${req.baseUrl}${req.route.path}` : req.route?.path || req.path || 'unmatched';
  const labels = {
    service: SERVICE_NAME,
    method: req.method,
    route,
    status: String(res.statusCode),
  };

  apiTelemetry.httpRequestsTotal.inc(labels);
  apiTelemetry.httpRequestDurationMs.observe(labels, durationMs);
};
