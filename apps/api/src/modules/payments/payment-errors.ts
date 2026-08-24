import { HttpException, HttpStatus } from '@nestjs/common';
import type { StellarPaymentErrorKind } from '@mixmatch/stellar';

const KIND_HTTP_STATUS: Record<StellarPaymentErrorKind, HttpStatus> = {
  source_account_not_found: HttpStatus.UNPROCESSABLE_ENTITY,
  sequence_conflict: HttpStatus.CONFLICT,
  insufficient_balance: HttpStatus.UNPROCESSABLE_ENTITY,
  insufficient_fee: HttpStatus.UNPROCESSABLE_ENTITY,
  destination_not_found: HttpStatus.UNPROCESSABLE_ENTITY,
  destination_requires_trustline: HttpStatus.UNPROCESSABLE_ENTITY,
  malformed_transaction: HttpStatus.BAD_REQUEST,
  timing: HttpStatus.CONFLICT,
  network_error: HttpStatus.BAD_GATEWAY,
  unknown: HttpStatus.INTERNAL_SERVER_ERROR,
};

/** Wraps a classified `StellarPaymentError` (from `@mixmatch/stellar`) as an HTTP-facing exception. */
export class PaymentFailedError extends HttpException {
  readonly kind: StellarPaymentErrorKind;

  constructor(kind: StellarPaymentErrorKind, message: string) {
    super(
      { code: kind.toUpperCase(), message },
      KIND_HTTP_STATUS[kind] ?? HttpStatus.INTERNAL_SERVER_ERROR,
    );
    this.kind = kind;
  }
}
