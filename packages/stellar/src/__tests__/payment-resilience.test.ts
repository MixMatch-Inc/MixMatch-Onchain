import { BadResponseError, Keypair, NotFoundError } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { StellarPaymentError } from '../payment-errors.js';
import { lookupPayment, resubmitPayment, StellarPaymentService, submitPayment } from '../payment.js';
import { KeypairWallet } from '../wallet.js';
import { fakeAccount, fakeClient } from './test-helpers.js';

function badSeq(): BadResponseError {
  return new BadResponseError('Transaction failed', {
    data: { extras: { result_codes: { transaction: 'tx_bad_seq', operations: [] } } },
  });
}

function setup(overrides: Parameters<typeof fakeClient>[0] = {}) {
  const sourceKeypair = Keypair.random();
  const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), ...overrides });
  const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());
  const base = { sourceWallet: wallet, destinationPublicKey: Keypair.random().publicKey(), amount: '10' };
  return { client, base };
}

describe('payment input validation', () => {
  it.each([
    ['an invalid destination', { destinationPublicKey: 'GNOPE' }],
    ['a zero amount', { amount: '0' }],
    ['a non-numeric amount', { amount: 'ten' }],
    ['more than 7 decimals', { amount: '1.12345678' }],
    ['a memo over 28 bytes', { memo: 'x'.repeat(29) }],
    ['a multi-byte memo over 28 bytes', { memo: 'é'.repeat(15) }],
    ['a bad asset code', { asset: { code: 'TOOLONGASSETCODE', issuer: Keypair.random().publicKey() } }],
    ['an invalid issuer', { asset: { code: 'USD', issuer: 'GNOPE' } }],
  ])('rejects %s as a validation error without touching the network', async (_label, patch) => {
    const loadAccount = vi.fn();
    const { client, base } = setup({ loadAccount });

    const error = await submitPayment(client, { ...base, ...patch }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(StellarPaymentError);
    expect((error as StellarPaymentError).kind).toBe('validation');
    expect(loadAccount).not.toHaveBeenCalled();
  });
});

describe('sequence conflicts', () => {
  it('reloads the account and retries after tx_bad_seq', async () => {
    const submit = vi.fn().mockRejectedValueOnce(badSeq()).mockResolvedValue({ hash: 'ok-hash', ledger: 7 });
    const loadAccount = vi.fn();
    const sourceKeypair = Keypair.random();
    loadAccount.mockImplementation(() => fakeAccount(sourceKeypair));
    const client = fakeClient({ loadAccount, submitTransaction: submit });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const result = await submitPayment(client, {
      sourceWallet: wallet,
      destinationPublicKey: Keypair.random().publicKey(),
      amount: '1',
    });

    expect(result).toEqual({ hash: 'ok-hash', ledger: 7 });
    expect(loadAccount).toHaveBeenCalledTimes(2);
  });

  it('gives up with sequence_conflict after three attempts', async () => {
    const submit = vi.fn().mockRejectedValue(badSeq());
    const { client, base } = setup({ submitTransaction: submit });

    const error = (await submitPayment(client, base).catch((e: unknown) => e)) as StellarPaymentError;

    expect(error.kind).toBe('sequence_conflict');
    expect(submit).toHaveBeenCalledTimes(3);
  });

  it('settles concurrent payments from one account', async () => {
    const sourceKeypair = Keypair.random();
    let nextSeq = 1;
    const submit = vi.fn().mockImplementation(() => {
      // Every other submission loses the sequence race.
      return nextSeq++ % 2 === 1 ? Promise.reject(badSeq()) : Promise.resolve({ hash: `h${nextSeq}`, ledger: nextSeq });
    });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction: submit });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());
    const destinationPublicKey = Keypair.random().publicKey();

    const results = await Promise.all(
      [1, 2, 3].map((n) => submitPayment(client, { sourceWallet: wallet, destinationPublicKey, amount: String(n) })),
    );

    expect(results).toHaveLength(3);
  });
});

describe('transaction hash on failure', () => {
  it('attaches txHash and the signed envelope when submission times out', async () => {
    const { client, base } = setup({ submitTransaction: () => Promise.reject(new Error('504 gateway timeout')) });

    const error = (await new StellarPaymentService(client).submitPayment(base).catch((e: unknown) => e)) as StellarPaymentError;

    expect(error.kind).toBe('network_error');
    expect(error.txHash).toMatch(/^[0-9a-f]{64}$/);
    expect(error.envelopeXdr).toBeTruthy();
  });

  it('omits the hash when the failure happens before a transaction exists', async () => {
    const { client, base } = setup({ loadAccount: () => Promise.reject(new Error('down')) });
    const error = (await submitPayment(client, base).catch((e: unknown) => e)) as StellarPaymentError;
    expect(error.txHash).toBeUndefined();
  });

  it('resubmits the identical envelope', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue({ hash: 'same', ledger: 9 });
    const { client, base } = setup({ submitTransaction: submit });
    const failed = (await submitPayment(client, base).catch((e: unknown) => e)) as StellarPaymentError;

    const result = await resubmitPayment(client, failed.envelopeXdr as string);

    expect(result).toEqual({ hash: 'same', ledger: 9 });
    const [first, second] = submit.mock.calls.map(([tx]) => (tx as { hash: () => Buffer }).hash().toString('hex'));
    expect(second).toBe(first);
    expect(second).toBe(failed.txHash);
  });
});

describe('lookupPayment', () => {
  function clientWithLookup(call: () => Promise<unknown>) {
    return fakeClient({}).horizon === undefined
      ? fakeClient({})
      : Object.assign(fakeClient({}), {
          horizon: { transactions: () => ({ transaction: () => ({ call }) }) },
        });
  }

  it('returns the recorded result', async () => {
    const client = clientWithLookup(() => Promise.resolve({ hash: 'abc', ledger_attr: 11 }));
    expect(await lookupPayment(client, 'abc')).toEqual({ hash: 'abc', ledger: 11 });
  });

  it('returns null when the network has no such transaction', async () => {
    const client = clientWithLookup(() => Promise.reject(new NotFoundError('nope', {})));
    expect(await lookupPayment(client, 'abc')).toBeNull();
  });
});
