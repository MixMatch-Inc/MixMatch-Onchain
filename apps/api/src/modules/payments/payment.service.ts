import { createStellarClient } from '@mixmatch/stellar';
import { StellarPaymentService, type PaymentResult, type PaymentHistoryEntry } from '@mixmatch/stellar';
import { ValidationError, NotFoundError } from '../../shared/errors/AppError.js';
import type { SendPaymentRequest } from './payment.types.js';

const STELLAR_ADDRESS_LENGTH = 56;
const STELLAR_ADDRESS_PREFIX = 'G';
const AMOUNT_REGEX = /^\d+(\.\d{1,7})?$/;

export class PaymentService {
  private readonly stellarPayment: StellarPaymentService;

  constructor() {
    const client = createStellarClient();
    this.stellarPayment = new StellarPaymentService(client);
  }

  async sendPayment(fromSecret: string, input: SendPaymentRequest): Promise<PaymentResult> {
    this.validateAddress(input.toAddress);
    this.validateAmount(input.amount);

    return this.stellarPayment.sendPayment(fromSecret, input.toAddress, input.amount, input.memo);
  }

  async getPaymentHistory(address: string, limit: number = 10): Promise<PaymentHistoryEntry[]> {
    this.validateAddress(address);

    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    return this.stellarPayment.getPaymentHistory(address, limit);
  }

  async getPaymentStatus(transactionHash: string): Promise<'pending' | 'success' | 'failed'> {
    if (!transactionHash || transactionHash.trim().length === 0) {
      throw new ValidationError('Transaction hash is required');
    }

    return this.stellarPayment.getPaymentStatus(transactionHash);
  }

  private validateAddress(address: string): void {
    if (!address || address.trim().length === 0) {
      throw new ValidationError('Stellar address is required');
    }
    if (address.length !== STELLAR_ADDRESS_LENGTH) {
      throw new ValidationError(`Stellar address must be ${STELLAR_ADDRESS_LENGTH} characters long`);
    }
    if (!address.startsWith(STELLAR_ADDRESS_PREFIX)) {
      throw new ValidationError('Stellar address must start with G');
    }
  }

  private validateAmount(amount: string): void {
    if (!amount || amount.trim().length === 0) {
      throw new ValidationError('Amount is required');
    }
    if (!AMOUNT_REGEX.test(amount)) {
      throw new ValidationError('Amount must be a positive number with up to 7 decimal places');
    }
    const num = parseFloat(amount);
    if (num <= 0) {
      throw new ValidationError('Amount must be greater than zero');
    }
  }
}
