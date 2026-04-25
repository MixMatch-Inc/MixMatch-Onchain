import type { NextFunction, Request, Response } from 'express';
import { getStellarRequestLogger } from '../config/logger';
import { observeRequestMetrics, stellarTelemetry } from '../config/observability';

const SERVICE_NAME = 'stellar-service';

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
  stellarTelemetry.httpInFlightRequests.inc({ service: SERVICE_NAME });

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    stellarTelemetry.httpInFlightRequests.dec({ service: SERVICE_NAME });
    observeRequestMetrics(req, res, durationMs);
    getStellarRequestLogger(req).info('request.completed', {
      method: req.method,
      route: resolveRouteLabel(req),
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
};
