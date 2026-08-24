import { BadResponseError, Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { StellarPaymentError } from '../payment-errors.js';
import { findStrictReceivePath, findStrictSendPath, submitPathPayment, type PathQuote } from '../path-payment.js';
import { KeypairWallet } from '../wallet.js';
import { fakeAccount, fakeClient } from './test-helpers.js';

const destination = Keypair.random().publicKey();
const issuer = Keypair.random().publicKey();

function mockStrictSendPaths(records: unknown[]) {
  return vi.fn().mockReturnValue({ call: () => Promise.resolve({ records }) });
}

function mockStrictReceivePaths(records: unknown[]) {
  return vi.fn().mockReturnValue({ call: () => Promise.resolve({ records }) });
}

describe('findStrictSendPath', () => {
  it('returns the path with the highest destination amount', async () => {
    const client = fakeClient({});
    client.horizon.strictSendPaths = mockStrictSendPaths([
      {
        source_amount: '10',
        destination_amount: '19.5',
        path: [{ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: issuer }],
      },
      {
        source_amount: '10',
        destination_amount: '20.1',
        path: [],
      },
    ]);

    const quote = await findStrictSendPath({
      client,
      sourceAsset: undefined,
      destAsset: { code: 'MMX', issuer },
      amount: '10',
    });

    expect(quote).toEqual({
      mode: 'strictSend',
      sourceAsset: undefined,
      destAsset: { code: 'MMX', issuer },
      sourceAmount: '10',
      destAmount: '20.1',
      path: [],
    });
  });

  it('returns null when no path exists', async () => {
    const client = fakeClient({});
    client.horizon.strictSendPaths = mockStrictSendPaths([]);

    const quote = await findStrictSendPath({
      client,
      destAsset: { code: 'MMX', issuer },
      amount: '10',
    });

    expect(quote).toBeNull();
  });

  it('wraps a Horizon failure as a StellarPaymentError', async () => {
    const client = fakeClient({});
    client.horizon.strictSendPaths = vi.fn().mockReturnValue({
      call: () => Promise.reject(new Error('network down')),
    });

    await expect(findStrictSendPath({ client, amount: '10' })).rejects.toBeInstanceOf(StellarPaymentError);
  });
});

describe('findStrictReceivePath', () => {
  it('returns the path with the lowest source amount', async () => {
    const client = fakeClient({});
    client.horizon.strictReceivePaths = mockStrictReceivePaths([
      { source_amount: '10.5', destination_amount: '20', path: [] },
      { source_amount: '9.8', destination_amount: '20', path: [] },
    ]);

    const quote = await findStrictReceivePath({
      client,
      destAsset: { code: 'MMX', issuer },
      amount: '20',
    });

    expect(quote).toEqual({
      mode: 'strictReceive',
      sourceAsset: undefined,
      destAsset: { code: 'MMX', issuer },
      sourceAmount: '9.8',
      destAmount: '20',
      path: [],
    });
  });

  it('returns null when no path exists', async () => {
    const client = fakeClient({});
    client.horizon.strictReceivePaths = mockStrictReceivePaths([]);

    const quote = await findStrictReceivePath({
      client,
      destAsset: { code: 'MMX', issuer },
      amount: '20',
    });

    expect(quote).toBeNull();
  });
});

describe('submitPathPayment', () => {
  it('builds a pathPaymentStrictSend operation with destMin reduced by the slippage tolerance', async () => {
    const sourceKeypair = Keypair.random();
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'send-hash', ledger: 7 });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const quote: PathQuote = {
      mode: 'strictSend',
      sourceAsset: undefined,
      destAsset: { code: 'MMX', issuer },
      sourceAmount: '10',
      destAmount: '20',
      path: [],
    };

    const result = await submitPathPayment({
      client,
      sourceWallet: wallet,
      destinationPublicKey: destination,
      quote,
      slippageBps: 100, // 1%
    });

    expect(result.hash).toBe('send-hash');
    const submittedTx = submitTransaction.mock.calls[0]?.[0];
    const op = submittedTx.operations[0];
    expect(op.type).toBe('pathPaymentStrictSend');
    expect(op.sendAmount).toBe('10.0000000');
    expect(op.destMin).toBe('19.8000000');
  });

  it('builds a pathPaymentStrictReceive operation with sendMax increased by the slippage tolerance', async () => {
    const sourceKeypair = Keypair.random();
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'receive-hash', ledger: 8 });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const quote: PathQuote = {
      mode: 'strictReceive',
      sourceAsset: undefined,
      destAsset: { code: 'MMX', issuer },
      sourceAmount: '10',
      destAmount: '20',
      path: [],
    };

    const result = await submitPathPayment({
      client,
      sourceWallet: wallet,
      destinationPublicKey: destination,
      quote,
      slippageBps: 100, // 1%
    });

    expect(result.hash).toBe('receive-hash');
    const submittedTx = submitTransaction.mock.calls[0]?.[0];
    const op = submittedTx.operations[0];
    expect(op.type).toBe('pathPaymentStrictReceive');
    expect(op.destAmount).toBe('20.0000000');
    expect(op.sendMax).toBe('10.1000000');
  });

  it('applies a default 0.5% slippage tolerance when none is specified', async () => {
    const sourceKeypair = Keypair.random();
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'h', ledger: 1 });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const quote: PathQuote = {
      mode: 'strictSend',
      destAsset: { code: 'MMX', issuer },
      sourceAmount: '10',
      destAmount: '100',
      path: [],
    };

    await submitPathPayment({ client, sourceWallet: wallet, destinationPublicKey: destination, quote });

    const submittedTx = submitTransaction.mock.calls[0]?.[0];
    expect(submittedTx.operations[0].destMin).toBe('99.5000000');
  });

  it('wraps a slippage-exceeded submission failure as a StellarPaymentError with kind slippage_exceeded', async () => {
    const sourceKeypair = Keypair.random();
    const client = fakeClient({
      loadAccount: () => fakeAccount(sourceKeypair),
      submitTransaction: () =>
        Promise.reject(
          new BadResponseError('Transaction failed', {
            data: {
              extras: { result_codes: { transaction: 'tx_failed', operations: ['op_under_destmin'] } },
            },
          }),
        ),
    });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const quote: PathQuote = {
      mode: 'strictSend',
      destAsset: { code: 'MMX', issuer },
      sourceAmount: '10',
      destAmount: '20',
      path: [],
    };

    await expect(
      submitPathPayment({ client, sourceWallet: wallet, destinationPublicKey: destination, quote }),
    ).rejects.toBeInstanceOf(StellarPaymentError);
  });

  it('propagates a memo onto the built transaction', async () => {
    const sourceKeypair = Keypair.random();
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'h', ledger: 1 });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const quote: PathQuote = {
      mode: 'strictSend',
      destAsset: { code: 'MMX', issuer },
      sourceAmount: '10',
      destAmount: '20',
      path: [],
    };

    await submitPathPayment({
      client,
      sourceWallet: wallet,
      destinationPublicKey: destination,
      quote,
      memo: 'order-7',
    });

    const submittedTx = submitTransaction.mock.calls[0]?.[0];
    expect(submittedTx.memo.value.toString()).toBe('order-7');
  });
});
