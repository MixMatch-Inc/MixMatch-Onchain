/**
 * `NEEDS_REVIEW` is distinct from `FAILED`: it means reconciliation could
 * neither confirm nor rule out that the payment landed on-chain (e.g.
 * Horizon was unreachable for the whole escalation window), so the outcome
 * is genuinely unknown rather than a confirmed failure. It needs a human
 * to check the ledger directly.
 */
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'NEEDS_REVIEW';

export interface TransactionRecord {
  id: string;
  idempotencyKey: string;
  stellarAccountId: string;
  destinationPublicKey: string;
  amount: string;
  memo: string | null;
  status: TransactionStatus;
  stellarTxHash: string | null;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendPaymentResponse {
  transaction: TransactionRecord;
}

export interface TransactionStatusResponse {
  transaction: TransactionRecord;
}

export interface TransactionHistoryResponse {
  transactions: TransactionRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface StellarAccountResponse {
  publicKey: string;
  network: 'testnet' | 'public';
}
