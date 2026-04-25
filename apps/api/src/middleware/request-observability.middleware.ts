import type { NextFunction, Request, Response } from 'express';
import { getApiRequestLogger } from '../config/logger';
import { apiTelemetry, observeRequestMetrics } from '../config/observability';

const SERVICE_NAME = 'api';

const resolveRouteLabel = (req: Request): string => {
  if (req.baseUrl && req.route?.path) {
    return `${req.baseUrl}${req.route.path}`;
  }

  return req.route?.path || req.path || 'unmatched';
};

export const requestObservabilityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startedAt = Date.now();
  apiTelemetry.httpInFlightRequests.inc({ service: SERVICE_NAME });

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    apiTelemetry.httpInFlightRequests.dec({ service: SERVICE_NAME });
    observeRequestMetrics(req, res, durationMs);
    getApiRequestLogger(req).info('request.completed', {
      method: req.method,
      route: resolveRouteLabel(req),
      statusCode: res.statusCode,
      durationMs,
      rateLimitPolicy: res.getHeader('RateLimit-Policy'),
    });
  });

  next();
};
