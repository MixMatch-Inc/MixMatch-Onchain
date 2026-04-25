import express from 'express';
import { getNetworkConfig, serverKeypair } from './config/stellar';
import { stellarEnv } from './config/env';
import { ensureFunded } from './services/friendbot';
import { sendPayment } from './services/payment.service';
import { checkAccount } from './services/account.service';
import { pollHistory } from './services/history.service';
import { createEscrow } from './services/escrow.service';
import { claimFunds } from './services/claim.service';
import { stellarContextMiddleware } from './middleware/context.middleware';
import { createLogger } from './utils/logger';
import { requestObservabilityMiddleware } from './middleware/request-observability.middleware';
import { isMetricsAuthorized, metricsHandler } from './config/observability';
import { stellarLogger } from './config/logger';

const app = express();
const port = stellarEnv.port;

app.use(express.json());
app.use(stellarContextMiddleware);
app.use(requestObservabilityMiddleware);

app.get('/', (_req: express.Request, res: express.Response) => {
  res.json({
    service: 'MixMatch Stellar Service',
    status: 'Active',
    config: getNetworkConfig(),
  });
});

app.get('/internal/metrics', (req, res) => {
  if (!isMetricsAuthorized(req)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  metricsHandler(req, res);
});

app.post('/payment', async (req, res) => {
  const logger = createLogger(req);

  try {
    const { destination, amount, memo } = req.body;

    if (!destination || typeof destination !== 'string') {
      logger.warn('Missing or invalid destination');
      res.status(400).json({ error: 'Missing or invalid destination' });
      return;
    }

    if (!amount || typeof amount !== 'string' || Number.isNaN(Number(amount))) {
      logger.warn('Missing or invalid amount');
      res.status(400).json({ error: 'Missing or invalid amount' });
      return;
    }

    logger.info(`Processing payment: ${amount} XLM to ${destination}`);
    const result = await sendPayment(destination, amount, memo);

    logger.info(`Payment successful: ${result.hash}`);
    res.json({
      success: true,
      hash: result.hash,
      message: `Sent ${amount} XLM to ${destination}`,
    });
  } catch (error: any) {
    logger.error('Payment failed', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment Failed',
    });
  }
});

app.get(
  '/account/:publicKey',
  async (req: express.Request, res: express.Response) => {
    const logger = createLogger(req);

    try {
      const { publicKey } = req.params;
      logger.info(`Checking account: ${publicKey.slice(0, 8)}...`);
      const result = await checkAccount(publicKey);

      if (!result.exists) {
        logger.info(`Account not found: ${publicKey.slice(0, 8)}`);
        res.status(404).json(result);
        return;
      }

      logger.info(`Account found: ${publicKey.slice(0, 8)}`);
      res.json(result);
    } catch (error: any) {
      logger.error('Account check failed', error.message);
      res.status(400).json({ error: error.message });
    }
  },
);

app.post('/escrow', async (req, res) => {
  const logger = createLogger(req);

  try {
    const { destination, amount, unlockDate } = req.body;

    if (!destination || !amount || !unlockDate) {
      logger.warn('Missing required fields for escrow');
      res
        .status(400)
        .json({ error: 'Missing destination, amount, or unlockDate' });
      return;
    }

    logger.info(`Creating escrow: ${amount} XLM to ${destination} until ${unlockDate}`);
    const result = await createEscrow(destination, amount, unlockDate);

    logger.info(`Escrow created: ${result.hash}`);
    res.json({
      success: true,
      hash: result.hash,
      message: `Escrow created! Funds locked until ${unlockDate}`,
    });
  } catch (error: any) {
    logger.error('Escrow creation failed', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Escrow Creation Failed',
    });
  }
});

app.post('/claim', async (req, res) => {
  const logger = createLogger(req);

  try {
    const { secretKey } = req.body;

    if (!secretKey) {
      logger.warn('Missing secretKey for claim');
      res.status(400).json({ error: 'Missing secretKey' });
      return;
    }

    logger.info('Processing claim request');
    const result = await claimFunds(secretKey);

    logger.info(`Claim successful: ${result.amount} XLM, hash: ${result.hash}`);
    res.json({
      success: true,
      message: `Successfully claimed ${result.amount} XLM!`,
      hash: result.hash,
    });
  } catch (error: any) {
    logger.error('Claim failed', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Claim Failed',
    });
  }
});

app.listen(port, async () => {
  stellarLogger.info('Stellar service listening', {
    port,
    publicKey: serverKeypair.publicKey(),
  });

  await ensureFunded();

  pollHistory();
});
