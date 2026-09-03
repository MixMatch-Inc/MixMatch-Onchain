/**
 * #914: Documented wire format for the `GET /payments/stream` SSE endpoint.
 *
 * The endpoint emits Server-Sent Events. Each event has no explicit `event:`
 * field (so browsers receive it as the default `message` type) and a `data:`
 * field that is a JSON-serialised `SseTransactionEvent`.
 *
 * Example raw SSE frame:
 * ```
 * data: {"transaction":{"id":"uuid","status":"SUCCESS","stellarTxHash":"abc...",...}}
 *
 * ```
 * (SSE frames are separated by a blank line.)
 *
 * Clients should handle the following status values in `transaction.status`:
 * - `"PENDING"`          — submitted to Stellar, not yet confirmed
 * - `"SUCCESS"`          — confirmed on-chain; `stellarTxHash` is set
 * - `"FAILED"`           — submission failed; `failureCode`/`failureReason` are set
 * - `"NEEDS_REVIEW"`     — escalated after repeated failed reconciliation
 * - `"PENDING_SIGNATURE"` — awaiting admin co-signature (high-value payments only)
 */
export interface SseTransactionEvent {
  transaction: {
    id: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'NEEDS_REVIEW' | 'PENDING_SIGNATURE';
    stellarTxHash?: string | null;
    failureCode?: string | null;
    failureReason?: string | null;
    amount: string;
    destinationPublicKey: string;
    createdAt: string;
    updatedAt: string;
  };
}
