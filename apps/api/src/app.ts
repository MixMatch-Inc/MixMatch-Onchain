import cors from 'cors';
import express from 'express';
import { apiEnv } from './config/env';
import {
  apiRateLimitMiddleware,
  isMetricsAuthorized,
  metricsHandler,
} from './config/observability';
import { discoveryRouter } from './domains/discovery';
import { identityRouter } from './domains/identity';
import { journeysRouter, journeyRouter } from './domains/journeys';
import { paymentsRouter } from './domains/payments';
import { resonanceRouter } from './domains/resonance';
import { tasteSignalsRouter } from './domains/taste-signals';
import { contextMiddleware } from './middleware/context.middleware';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { requestObservabilityMiddleware } from './middleware/request-observability.middleware';
import { openApiDocument } from './openapi/document';

export const createApp = () => {
  const app = express();

  app.use(cors({ origin: apiEnv.corsOrigin }));
  app.use(express.json());
  app.use(contextMiddleware);
  app.use(apiRateLimitMiddleware);
  app.use(requestObservabilityMiddleware);

  app.get('/', (_req, res) => {
    res.json({ message: 'MixMatch API Running', status: 'OK' });
  });

  app.get('/openapi/v1.json', (_req, res) => {
    res.status(200).json(openApiDocument);
  });

  app.get('/internal/metrics', (req, res) => {
    if (!isMetricsAuthorized(req)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    metricsHandler(req, res);
  });

  app.use('/auth', identityRouter);
  app.use('/bookings', journeysRouter);
  app.use('/journeys', journeyRouter);
  app.use('/taste-signals', tasteSignalsRouter);
  app.use('/discover', discoveryRouter);
  app.use('/resonance', resonanceRouter);
  app.use('/payments', paymentsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
