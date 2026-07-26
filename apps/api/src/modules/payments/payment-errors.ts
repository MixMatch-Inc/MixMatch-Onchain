import type { StellarPaymentErrorKind } from '@mixmatch/stellar';
import { AppError } from '../../shared/errors/AppError.js';

const KIND_HTTP_STATUS: Record<StellarPaymentErrorKind, number> = {
  source_account_not_found: 422,
  sequence_conflict: 409,
  insufficient_balance: 422,
  insufficient_fee: 422,
  destination_not_found: 422,
  destination_requires_trustline: 422,
  malformed_transaction: 400,
  timing: 409,
  network_error: 502,
  unknown: 500,
};

/** Wraps a classified `StellarPaymentError` (from `@mixmatch/stellar`) as an HTTP-facing `AppError`. */
export class PaymentFailedError extends AppError {
  readonly kind: StellarPaymentErrorKind;

  constructor(kind: StellarPaymentErrorKind, message: string) {
    super(message, KIND_HTTP_STATUS[kind] ?? 500, kind.toUpperCase());
    this.name = 'PaymentFailedError';
    this.kind = kind;
  }
}
