import { BadResponseError, NotFoundError, TransactionFailedError } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { classifyStellarPaymentError, StellarPaymentError } from './payment-errors.js';

function txFailed(transaction: string, operations: string[] = []): TransactionFailedError {
  return new TransactionFailedError('Transaction Failed', {
    data: { extras: { result_codes: { transaction, operations } } },
  });
}

describe('classifyStellarPaymentError', () => {
  it('classifies a missing source account as source_account_not_found', () => {
    const result = classifyStellarPaymentError(new NotFoundError('Not Found', {}));
    expect(result.kind).toBe('source_account_not_found');
  });

  it('classifies op_underfunded as insufficient_balance', () => {
    const result = classifyStellarPaymentError(txFailed('tx_failed', ['op_underfunded']));
    expect(result.kind).toBe('insufficient_balance');
    expect(result.operationCodes).toEqual(['op_underfunded']);
  });

  it('classifies op_no_destination as destination_not_found', () => {
    const result = classifyStellarPaymentError(txFailed('tx_failed', ['op_no_destination']));
    expect(result.kind).toBe('destination_not_found');
  });

  it('classifies op_no_trust as destination_requires_trustline', () => {
    const result = classifyStellarPaymentError(txFailed('tx_failed', ['op_no_trust']));
    expect(result.kind).toBe('destination_requires_trustline');
  });

  it('classifies tx_bad_seq (no operations evaluated) as sequence_conflict', () => {
    const result = classifyStellarPaymentError(txFailed('tx_bad_seq', []));
    expect(result.kind).toBe('sequence_conflict');
    expect(result.transactionCode).toBe('tx_bad_seq');
  });

  it('classifies tx_insufficient_fee as insufficient_fee', () => {
    const result = classifyStellarPaymentError(txFailed('tx_insufficient_fee', []));
    expect(result.kind).toBe('insufficient_fee');
  });

  it('classifies tx_too_late as timing', () => {
    const result = classifyStellarPaymentError(txFailed('tx_too_late', []));
    expect(result.kind).toBe('timing');
  });

  it('falls back to unknown for an unrecognized transaction code', () => {
    const result = classifyStellarPaymentError(txFailed('tx_internal_error', []));
    expect(result.kind).toBe('unknown');
  });

  it('classifies a generic BadResponseError as unknown', () => {
    const result = classifyStellarPaymentError(new BadResponseError('Bad Response', {}));
    expect(result.kind).toBe('unknown');
  });

  it('classifies a generic Error (e.g. fetch failure) as network_error', () => {
    const result = classifyStellarPaymentError(new TypeError('fetch failed'));
    expect(result.kind).toBe('network_error');
    expect(result.message).toContain('fetch failed');
  });

  it('classifies a non-Error throw as unknown', () => {
    const result = classifyStellarPaymentError('some string throw');
    expect(result.kind).toBe('unknown');
  });

  it('passes an already-classified StellarPaymentError through unchanged', () => {
    const original = new StellarPaymentError('insufficient_balance', 'already classified');
    const result = classifyStellarPaymentError(original);
    expect(result).toBe(original);
  });

  it('preserves the original error as `cause`', () => {
    const original = new NotFoundError('Not Found', {});
    const result = classifyStellarPaymentError(original);
    expect(result.cause).toBe(original);
  });
});
