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
