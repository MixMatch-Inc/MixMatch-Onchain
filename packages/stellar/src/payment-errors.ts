import { BadResponseError, Horizon, NotFoundError, TransactionFailedError } from '@stellar/stellar-sdk';

/**
 * Normalized classification of a failed Stellar payment, so callers can
 * branch on failure kind without depending on Horizon's raw error shapes.
 */
export type StellarPaymentErrorKind =
  | 'source_account_not_found'
  | 'sequence_conflict'
  | 'insufficient_balance'
  | 'insufficient_fee'
  | 'destination_not_found'
  | 'destination_requires_trustline'
  | 'malformed_transaction'
  | 'timing'
  | 'network_error'
  | 'unknown';

const TRANSACTION_CODE_KIND: Partial<
  Record<Horizon.HorizonApi.TransactionFailedResultCodes, StellarPaymentErrorKind>
> = {
  tx_bad_seq: 'sequence_conflict',
  tx_insufficient_balance: 'insufficient_balance',
  tx_insufficient_fee: 'insufficient_fee',
  tx_too_early: 'timing',
  tx_too_late: 'timing',
  tx_bad_auth: 'malformed_transaction',
  tx_bad_auth_extra: 'malformed_transaction',
  tx_missing_operation: 'malformed_transaction',
  tx_not_supported: 'malformed_transaction',
  tx_malformed: 'malformed_transaction',
  tx_soroban_invalid: 'malformed_transaction',
};

const OPERATION_CODE_KIND: Record<string, StellarPaymentErrorKind> = {
  op_underfunded: 'insufficient_balance',
  op_low_reserve: 'insufficient_balance',
  op_no_destination: 'destination_not_found',
  op_no_trust: 'destination_requires_trustline',
  op_no_issuer: 'destination_requires_trustline',
};

/** A payment failure, normalized to a stable `kind` plus the raw Horizon detail (if any). */
export class StellarPaymentError extends Error {
  readonly kind: StellarPaymentErrorKind;
  readonly transactionCode?: string;
  readonly operationCodes?: string[];
  override readonly cause?: unknown;

  constructor(
    kind: StellarPaymentErrorKind,
    message: string,
    options?: { transactionCode?: string; operationCodes?: string[]; cause?: unknown },
  ) {
    super(message);
    this.name = 'StellarPaymentError';
    this.kind = kind;
    this.transactionCode = options?.transactionCode;
    this.operationCodes = options?.operationCodes;
    this.cause = options?.cause;
  }
}

/** Converts any error thrown while loading an account or submitting a transaction into a `StellarPaymentError`. */
export function classifyStellarPaymentError(error: unknown): StellarPaymentError {
  if (error instanceof StellarPaymentError) {
    return error;
  }

  if (error instanceof NotFoundError) {
    return new StellarPaymentError('source_account_not_found', 'Source account not found. It may not be funded yet.', {
      cause: error,
    });
  }

  if (error instanceof TransactionFailedError) {
    const { transaction, operations } = error.getResultCodes();

    for (const code of operations) {
      const kind = OPERATION_CODE_KIND[code];
      if (kind) {
        return new StellarPaymentError(kind, `Payment operation failed: ${code}`, {
          transactionCode: transaction,
          operationCodes: operations,
          cause: error,
        });
      }
    }

    const kind = TRANSACTION_CODE_KIND[transaction] ?? 'unknown';
    return new StellarPaymentError(kind, `Payment transaction failed: ${transaction}`, {
      transactionCode: transaction,
      operationCodes: operations,
      cause: error,
    });
  }

  if (error instanceof BadResponseError) {
    return new StellarPaymentError('unknown', 'Horizon rejected the payment for an unrecognized reason.', {
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new StellarPaymentError('network_error', `Failed to reach Stellar network: ${error.message}`, {
      cause: error,
    });
  }

  return new StellarPaymentError('unknown', 'Unknown error while submitting payment.', { cause: error });
}
