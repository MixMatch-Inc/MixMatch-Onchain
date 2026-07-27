import type { StellarNetwork } from '@mixmatch/stellar';

export interface StellarAccountRecord {
  id: string;
  userId: string;
  publicKey: string;
  encryptedSecretKey: string;
  network: StellarNetwork;
  createdAt: Date;
  updatedAt: Date;
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface SendPaymentDto {
  destinationPublicKey: string;
  amount: string;
  memo?: string;
  idempotencyKey?: string;
}

export interface SendPaymentResponse {
  transaction: TransactionRecord;
}
