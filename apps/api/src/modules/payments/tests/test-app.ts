import cors from 'cors';
import express, { type Express, Router } from 'express';
import type { DefaultStellarClient } from '@mixmatch/stellar';
import { StellarPaymentService as StellarPaymentEngine } from '@mixmatch/stellar';
import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { errorMiddleware } from '../../../shared/middleware/error.middleware.js';
import { requireAuth, type AuthenticatedRequest } from '../../../shared/middleware/auth.middleware.js';
import { PaymentsController } from '../payments.controller.js';
import { PaymentsService } from '../payments.service.js';
import { InMemoryStellarAccountRepository } from '../stellar-account.repository.js';
import { InMemoryTransactionRepository } from '../transaction.repository.js';

export interface TestAppHandles {
  app: Express;
  paymentsService: PaymentsService;
  stellarAccountRepository: InMemoryStellarAccountRepository;
  transactionRepository: InMemoryTransactionRepository;
}

/**
 * Builds an in-memory-backed payments app for controller tests — same
 * shape as `apps/api/src/modules/auth/tests/test-app.ts`. `stellarClient`
 * and `paymentEngine` are provided by the caller (a fake `Horizon.Server`
 * and a real-or-fake `StellarPaymentService`) so tests never touch the
 * network.
 */
export function createTestApp(stellarClient: DefaultStellarClient): TestAppHandles {
  const stellarAccountRepository = new InMemoryStellarAccountRepository();
  const transactionRepository = new InMemoryTransactionRepository();
  const paymentEngine = new StellarPaymentEngine(stellarClient);
  const paymentsService = new PaymentsService(
    stellarAccountRepository,
    transactionRepository,
    stellarClient,
    paymentEngine,
  );
  const controller = new PaymentsController(paymentsService);

  const router = Router();
  router.post('/send', requireAuth, asyncHandler<AuthenticatedRequest>(controller.send));
  router.get('/account', requireAuth, asyncHandler<AuthenticatedRequest>(controller.account));
  router.get('/history', requireAuth, asyncHandler<AuthenticatedRequest>(controller.history));
  router.get('/:id/status', requireAuth, asyncHandler<AuthenticatedRequest>(controller.status));
  router.post('/:id/reconcile', requireAuth, asyncHandler<AuthenticatedRequest>(controller.reconcile));

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/payments', router);
  app.use(errorMiddleware);

  return { app, paymentsService, stellarAccountRepository, transactionRepository };
}
