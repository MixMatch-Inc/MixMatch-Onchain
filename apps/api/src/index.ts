import connectDB from './config/db';
import { apiEnv } from './config/env';
import { createApp } from './app';
import { apiLogger } from './config/logger';

const app = createApp();
const port = apiEnv.port;

const start = async () => {
  await connectDB();

  app.listen(port, () => {
    apiLogger.info('API listening', { port });
  });
};

start().catch((error) => {
  apiLogger.error('API failed to start', { error });
  process.exit(1);
});
