export type AnchorTransactionKind = 'deposit' | 'withdrawal';

/**
 * Mirrors `@mixmatch/stellar`'s `Sep24TransactionStatus` — kept as a
 * separate type here so `@mixmatch/shared` doesn't depend on
 * `@mixmatch/stellar`.
 */
export type AnchorTransactionStatus =
  | 'incomplete'
  | 'pending_user_transfer_start'
  | 'pending_user_transfer_complete'
  | 'pending_external'
  | 'pending_anchor'
  | 'pending_stellar'
  | 'pending_trust'
  | 'pending_user'
  | 'on_hold'
  | 'completed'
  | 'refunded'
  | 'expired'
  | 'error';

export interface AnchorTransactionRecord {
  id: string;
  stellarAccountId: string;
  kind: AnchorTransactionKind;
  assetCode: string;
  homeDomain: string;
  sep24TransactionId: string;
  status: AnchorTransactionStatus;
  interactiveUrl: string | null;
  moreInfoUrl: string | null;
  amountIn: string | null;
  amountOut: string | null;
  stellarTransactionId: string | null;
  externalTransactionId: string | null;
  message: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitiateAnchorTransactionResponse {
  transaction: AnchorTransactionRecord;
  /** URL to open (redirect or iframe) for the user to complete KYC/payment details on the anchor's side. */
  interactiveUrl: string;
}

export interface AnchorTransactionStatusResponse {
  transaction: AnchorTransactionRecord;
}

export interface AnchorTransactionHistoryResponse {
  transactions: AnchorTransactionRecord[];
  total: number;
  page: number;
  limit: number;
}

export type AnchorOperation = 'deposit' | 'withdraw';

/** Response of `GET /anchor/rates` (#1402): the anchor's SEP-24 fee for an asset before the user starts. */
export interface AnchorRateResponse {
  assetCode: string;
  operation: AnchorOperation;
  enabled: boolean;
  /** Fee for `amount`, when an amount was supplied. */
  feeTotal: string | null;
  feeFixed: string | null;
  feePercent: string | null;
  minAmount: string | null;
  maxAmount: string | null;
}
