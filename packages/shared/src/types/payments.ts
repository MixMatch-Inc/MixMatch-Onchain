/**
 * `NEEDS_REVIEW` is distinct from `FAILED`: it means reconciliation could
 * neither confirm nor rule out that the payment landed on-chain (e.g.
 * Horizon was unreachable for the whole escalation window), so the outcome
 * is genuinely unknown rather than a confirmed failure. It needs a human
 * to check the ledger directly.
 *
 * `PENDING_SIGNATURE` is for a payment above the high-value threshold: the
 * caller's own signature is on file, but an admin co-signature is still
 * required before it can be submitted to the network. See
 * `@mixmatch/stellar`'s `buildHighValuePaymentEnvelope`/`configureMultisig`.
 */
export type TransactionStatus = 'PENDING' | 'PENDING_SIGNATURE' | 'SUCCESS' | 'FAILED' | 'NEEDS_REVIEW';

export interface TransactionRecord {
  id: string;
  idempotencyKey: string;
  stellarAccountId: string;
  destinationPublicKey: string;
  amount: string;
  memo: string | null;
  /** Null means native XLM; otherwise the custom asset's code (e.g. "MMX"). */
  assetCode: string | null;
  /** Null means native XLM; otherwise the custom asset's issuing account. */
  assetIssuer: string | null;
  /** Set only for a path payment, where the recipient receives a different asset than assetCode/assetIssuer. Null means "same asset as sent". */
  receiveAssetCode: string | null;
  /** Set only for a path payment. Null means "same asset as sent". */
  receiveAssetIssuer: string | null;
  /** Set only for a path payment: the exact amount the recipient receives. Null for a plain payment (equal to `amount`). */
  destAmount: string | null;
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

/** Admin-facing: transactions awaiting a co-signature, across all users. */
export interface PendingSignatureTransactionsResponse {
  transactions: TransactionRecord[];
}

/**
 * Wire format for a single event emitted on the `GET /payments/stream` SSE endpoint.
 * The server wraps each event as `{ "data": TransactionStreamEvent }` in the SSE `data:` field.
 * Clients should parse the JSON payload and call their transaction update handler.
 *
 * Both the API (`payments.controller.ts` / `payments.service.ts`) and the mobile client
 * (`payments-client.ts`) use this type so the contract stays in sync (#914).
 */
export interface TransactionStreamEvent {
  /** The updated transaction record. */
  transaction: TransactionRecord;
}

export interface StellarAccountResponse {
  publicKey: string;
  network: 'testnet' | 'public';
}

export interface EstablishTrustlineResponse {
  stellarTxHash: string;
  assetCode: string;
  assetIssuer: string;
}

/** A hop in a payment path — `null` means native XLM. */
export interface PathAssetHop {
  assetCode: string;
  assetIssuer: string;
}

export interface PathQuoteResponse {
  mode: 'strictSend' | 'strictReceive';
  /** The exact amount sent (known up front for strictSend, computed for strictReceive). */
  sourceAmount: string;
  /** The exact amount received (known up front for strictReceive, computed for strictSend). */
  destAmount: string;
  /** Intermediate assets the payment routes through, in order. */
  path: (PathAssetHop | null)[];
}
