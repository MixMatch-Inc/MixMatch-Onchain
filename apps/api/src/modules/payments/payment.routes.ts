import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/async-handler.js';
import { requireAuth, type AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { PaymentService } from './payment.service.js';
import type { SendPaymentRequest, PaymentHistoryResponse, PaymentStatusResponse } from './payment.types.js';
import { ValidationError } from '../../shared/errors/AppError.js';

export function createPaymentRouter(): Router {
  const paymentService = new PaymentService();
  const router = Router();

  router.post(
    '/send',
    requireAuth,
    asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res) => {
      const { toAddress, amount, memo } = req.body as SendPaymentRequest;

      if (!toAddress || !amount) {
        throw new ValidationError('toAddress and amount are required');
      }

      const result = await paymentService.sendPayment(req.userId!, { toAddress, amount, memo });

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    }),
  );

  router.get(
    '/history',
    requireAuth,
    asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res) => {
      const address = req.query.address as string;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      if (!address) {
        throw new ValidationError('address query parameter is required');
      }

      const payments = await paymentService.getPaymentHistory(address, limit);
      const response: PaymentHistoryResponse = {
        payments,
        total: payments.length,
      };

      res.status(200).json(response);
    }),
  );

  router.get(
    '/status/:hash',
    requireAuth,
    asyncHandler<AuthenticatedRequest>(async (req: AuthenticatedRequest, res) => {
      const { hash } = req.params;

      if (!hash) {
        throw new ValidationError('Transaction hash is required');
      }

      const status = await paymentService.getPaymentStatus(hash);
      const response: PaymentStatusResponse = {
        hash,
        status,
      };

      res.status(200).json(response);
    }),
  );

  return router;
}
