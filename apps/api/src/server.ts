import { createApp } from './app.js';
import { env } from './shared/config/env.js';
import { logger } from './shared/logger/logger.js';

const app = createApp();

app.listen(env.port, () => {
  logger.info(`API server listening on port ${env.port}`);
});
