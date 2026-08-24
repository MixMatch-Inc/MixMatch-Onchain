import { BadResponseError, NotFoundError } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { classifyStellarPaymentError, StellarPaymentError } from '../payment-errors.js';

function horizonFailure(transactionCode: string, operationCodes: string[] = []): BadResponseError {
  return new BadResponseError('Transaction failed', {
    data: {
      extras: {
        result_codes: {
          transaction: transactionCode,
          operations: operationCodes,
        },
      },
    },
  });
}

describe('classifyStellarPaymentError', () => {
  it('passes through an already-classified StellarPaymentError unchanged', () => {
    const original = new StellarPaymentError('insufficient_balance', 'not enough funds');
    expect(classifyStellarPaymentError(original)).toBe(original);
  });

  it('classifies NotFoundError as source_account_not_found', () => {
    const error = classifyStellarPaymentError(new NotFoundError('not found', {}));
    expect(error.kind).toBe('source_account_not_found');
  });

  it('classifies op_underfunded as insufficient_balance', () => {
    const error = classifyStellarPaymentError(horizonFailure('tx_failed', ['op_underfunded']));
    expect(error.kind).toBe('insufficient_balance');
  });

  it('classifies op_no_destination as destination_not_found', () => {
    const error = classifyStellarPaymentError(horizonFailure('tx_failed', ['op_no_destination']));
    expect(error.kind).toBe('destination_not_found');
  });

  it('classifies op_no_trust as destination_requires_trustline', () => {
    const error = classifyStellarPaymentError(horizonFailure('tx_failed', ['op_no_trust']));
    expect(error.kind).toBe('destination_requires_trustline');
  });

  it('falls back to the transaction-level code when no operation code matches', () => {
    const error = classifyStellarPaymentError(horizonFailure('tx_bad_seq', []));
    expect(error.kind).toBe('sequence_conflict');
  });

  it('classifies tx_insufficient_fee at the transaction level', () => {
    const error = classifyStellarPaymentError(horizonFailure('tx_insufficient_fee', []));
    expect(error.kind).toBe('insufficient_fee');
  });

  it('falls back to unknown for an unrecognized transaction code', () => {
    const error = classifyStellarPaymentError(horizonFailure('tx_totally_new_code', []));
    expect(error.kind).toBe('unknown');
  });

  it('classifies a BadResponseError with no result_codes as unknown', () => {
    const error = classifyStellarPaymentError(new BadResponseError('weird', { data: {} }));
    expect(error.kind).toBe('unknown');
  });

  it('classifies a plain Error as network_error', () => {
    const error = classifyStellarPaymentError(new Error('ECONNREFUSED'));
    expect(error.kind).toBe('network_error');
  });

  it('classifies a non-Error throw as unknown', () => {
    const error = classifyStellarPaymentError('some string was thrown');
    expect(error.kind).toBe('unknown');
  });

  it('preserves the original error as cause', () => {
    const original = new Error('boom');
    const error = classifyStellarPaymentError(original);
    expect(error.cause).toBe(original);
  });
});
