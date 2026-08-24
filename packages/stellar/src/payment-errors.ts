import { BadResponseError, NotFoundError } from '@stellar/stellar-sdk';

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
  /** The caller's own account doesn't hold a trustline for the asset it's trying to send. */
  | 'source_requires_trustline'
  /** The asset's issuing account doesn't exist — distinct from `destination_requires_trustline`. */
  | 'issuer_not_found'
  /** Sending would push the destination's trustline balance past its configured limit. */
  | 'trustline_limit_exceeded'
  /** The asset issuer requires explicit authorization and this account isn't authorized to hold/send it. */
  | 'not_authorized'
  /** A `changeTrust` call passed a limit outside the valid range (e.g. negative). */
  | 'invalid_trustline_limit'
  | 'malformed_transaction'
  | 'timing'
  | 'network_error'
  | 'unknown';

const TRANSACTION_CODE_KIND: Record<string, StellarPaymentErrorKind> = {
  tx_bad_seq: 'sequence_conflict',
  tx_insufficient_balance: 'insufficient_balance',
  tx_insufficient_fee: 'insufficient_fee',
  tx_no_source_account: 'source_account_not_found',
  tx_too_early: 'timing',
  tx_too_late: 'timing',
  tx_bad_auth: 'malformed_transaction',
  tx_bad_auth_extra: 'malformed_transaction',
  tx_missing_operation: 'malformed_transaction',
  tx_not_supported: 'malformed_transaction',
};

const OPERATION_CODE_KIND: Record<string, StellarPaymentErrorKind> = {
  op_underfunded: 'insufficient_balance',
  op_low_reserve: 'insufficient_balance',
  op_no_destination: 'destination_not_found',
  op_no_trust: 'destination_requires_trustline',
  op_src_no_trust: 'source_requires_trustline',
  op_no_issuer: 'issuer_not_found',
  op_line_full: 'trustline_limit_exceeded',
  op_not_authorized: 'not_authorized',
  op_src_not_authorized: 'not_authorized',
  op_invalid_limit: 'invalid_trustline_limit',
};

interface HorizonTransactionFailedBody {
  extras?: {
    result_codes?: {
      transaction?: string;
      operations?: string[];
    };
  };
}

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

  if (error instanceof BadResponseError) {
    const body = error.response?.data as HorizonTransactionFailedBody | undefined;
    const resultCodes = body?.extras?.result_codes;
    const operationCodes = resultCodes?.operations ?? [];

    for (const code of operationCodes) {
      const kind = OPERATION_CODE_KIND[code];
      if (kind) {
        return new StellarPaymentError(kind, `Payment operation failed: ${code}`, {
          transactionCode: resultCodes?.transaction,
          operationCodes,
          cause: error,
        });
      }
    }

    if (resultCodes?.transaction) {
      const kind = TRANSACTION_CODE_KIND[resultCodes.transaction] ?? 'unknown';
      return new StellarPaymentError(kind, `Payment transaction failed: ${resultCodes.transaction}`, {
        transactionCode: resultCodes.transaction,
        operationCodes,
        cause: error,
      });
    }

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
