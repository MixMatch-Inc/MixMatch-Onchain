import { Router } from 'express';
import { createStellarClient, StellarPaymentService as StellarPaymentEngine } from '@mixmatch/stellar';
import { asyncHandler } from '../../shared/middleware/async-handler.js';
import { requireAuth, type AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { PrismaStellarAccountRepository } from './stellar-account.repository.js';
import { PrismaTransactionRepository } from './transaction.repository.js';

export function createPaymentsRouter(): Router {
  const stellarClient = createStellarClient();
  const paymentEngine = new StellarPaymentEngine(stellarClient);
  const paymentsService = new PaymentsService(
    new PrismaStellarAccountRepository(),
    new PrismaTransactionRepository(),
    stellarClient,
    paymentEngine,
  );
  const controller = new PaymentsController(paymentsService);

  const router = Router();
  router.post('/send', requireAuth, asyncHandler<AuthenticatedRequest>(controller.send));
  router.get('/history', requireAuth, asyncHandler<AuthenticatedRequest>(controller.history));
  router.get('/:id/status', requireAuth, asyncHandler<AuthenticatedRequest>(controller.status));
  router.post('/:id/reconcile', requireAuth, asyncHandler<AuthenticatedRequest>(controller.reconcile));

  return router;
}
