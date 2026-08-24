export type EscrowStatus = 'PENDING' | 'LOCKED' | 'RELEASED' | 'REFUNDED' | 'FAILED';

export interface EscrowRecord {
  id: string;
  idempotencyKey: string;
  payerStellarAccountId: string;
  payeePublicKey: string;
  tokenContractId: string;
  amount: string;
  /** The contract's on-chain u64 escrow id, as a string; null until the deposit transaction lands. */
  onChainEscrowId: string | null;
  /** Ledger sequence at/after which the escrow becomes refundable by anyone; null until the deposit lands. */
  timeoutLedger: number | null;
  status: EscrowStatus;
  depositTxHash: string | null;
  finalizeTxHash: string | null;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepositEscrowResponse {
  escrow: EscrowRecord;
}

export interface EscrowStatusResponse {
  escrow: EscrowRecord;
}
