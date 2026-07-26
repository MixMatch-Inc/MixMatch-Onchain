import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';
import { ValidationError } from '../../shared/errors/AppError.js';
import type { PaymentsService } from './payments.service.js';
import { parseHistoryQuery, parseSendPaymentInput } from './payments.validators.js';

export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  send = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = parseSendPaymentInput(req.body);
    const transaction = await this.paymentsService.sendPayment(req.userId!, input);
    res.status(201).json({ transaction });
  };

  status = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const transactionId = req.params.id;
    if (!transactionId) {
      throw new ValidationError('Missing transaction id');
    }
    const transaction = await this.paymentsService.getTransactionStatus(req.userId!, transactionId);
    res.status(200).json({ transaction });
  };

  history = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { page, limit } = parseHistoryQuery(req.query as Record<string, unknown>);
    const { transactions, total } = await this.paymentsService.listTransactionHistory(req.userId!, page, limit);
    res.status(200).json({ transactions, total, page, limit });
  };

  reconcile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const transactionId = req.params.id;
    if (!transactionId) {
      throw new ValidationError('Missing transaction id');
    }
    const transaction = await this.paymentsService.reconcileTransactionById(req.userId!, transactionId);
    res.status(200).json({ transaction });
  };
}
