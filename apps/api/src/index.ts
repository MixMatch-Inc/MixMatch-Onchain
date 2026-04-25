import connectDB from './config/db';
import { apiEnv } from './config/env';
import { createApp } from './app';
import { apiLogger } from './config/logger';
import { identityRouter } from './domains/identity';
import { journeysRouter, journeyRouter } from './domains/journeys';
import { discoveryRouter } from './domains/discovery';
import { paymentsRouter } from './domains/payments';
import { resonanceRouter } from './domains/resonance';
import { tracksRouter } from './domains/tracks';
import { notFoundHandler } from './middleware/not-found.middleware';
import { errorHandler } from './middleware/error.middleware';
import healthRouter from './routes/health.router';
import { setupEventHandlers } from './domains/events/event-handlers';
import { registerPlaceholderJobs, getJobQueue } from './jobs';

const app = createApp();
const port = apiEnv.port;

const start = async () => {
  await connectDB();

  // Setup event handlers and jobs
  setupEventHandlers();
  registerPlaceholderJobs(getJobQueue());

  app.use(healthRouter);
  app.use('/auth', identityRouter);
  app.use('/bookings', journeysRouter);
  app.use('/journeys', journeyRouter);
  app.use('/discover', discoveryRouter);
  app.use('/payments', paymentsRouter);
  app.use('/resonance', resonanceRouter);
  app.use('/tracks', tracksRouter);

  app.listen(port, () => {
    apiLogger.info('API listening', { port });
  });
};

start().catch((error) => {
  apiLogger.error('API failed to start', { error });
  process.exit(1);
});
