import type { Request, Response } from 'express';
import { getOrCreateRegistry, registerMixMatchTelemetry } from '@mixmatch/observability';
import { stellarEnv } from './env';

const SERVICE_NAME = 'stellar-service';

export const stellarMetricsRegistry = getOrCreateRegistry('mixmatch-stellar-service');
export const stellarTelemetry = registerMixMatchTelemetry(stellarMetricsRegistry);

stellarTelemetry.websocketConnections.set({ service: SERVICE_NAME }, 0);
stellarTelemetry.outboxBacklog.set({ service: SERVICE_NAME, queue: 'history-poller' }, 0);

export const isMetricsAuthorized = (req: Request): boolean => {
  const metricsToken = stellarEnv.metricsAuthToken;

  if (metricsToken && req.header('authorization') === `Bearer ${metricsToken}`) {
    return true;
  }

  const secret = stellarEnv.internalServiceSecret;
  return Boolean(secret && req.header('x-mixmatch-service-secret') === secret);
};

export const metricsHandler = (_req: Request, res: Response): void => {
  res.type('text/plain').send(stellarMetricsRegistry.renderPrometheus());
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
    stellarTelemetry.providerCallsTotal.inc({
      service: SERVICE_NAME,
      provider,
      operation,
      outcome: 'success',
    });
    stellarTelemetry.providerCallDurationMs.observe(
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
    stellarTelemetry.providerCallsTotal.inc({
      service: SERVICE_NAME,
      provider,
      operation,
      outcome: 'error',
    });
    stellarTelemetry.providerCallDurationMs.observe(
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

  stellarTelemetry.httpRequestsTotal.inc(labels);
  stellarTelemetry.httpRequestDurationMs.observe(labels, durationMs);
};
