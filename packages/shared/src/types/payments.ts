/**
 * Shared payment types used across the API and web apps.
 * Wire-format shapes for `apps/api`'s `/api/payments/*` endpoints
 * (dates are ISO strings over JSON, unlike the service layer's `Date` objects).
 */

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

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

export interface SendPaymentInput {
  destinationPublicKey: string;
  amount: string;
  memo?: string;
  idempotencyKey?: string;
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

/** The caller's own Stellar account — public key only, never the secret key. */
export interface MyStellarAccount {
  publicKey: string;
  network: string;
}

export interface MyAccountResponse {
  account: MyStellarAccount;
}
