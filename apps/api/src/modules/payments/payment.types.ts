import type { PaymentHistoryEntry } from '@mixmatch/stellar';

export interface SendPaymentRequest {
  toAddress: string;
  amount: string;
  memo?: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentHistoryEntry[];
  total: number;
}

export interface PaymentStatusResponse {
  hash: string;
  status: 'pending' | 'success' | 'failed';
}
