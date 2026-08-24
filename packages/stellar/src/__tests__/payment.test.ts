import { Asset, Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { StellarPaymentError } from '../payment-errors.js';
import { StellarPaymentService } from '../payment.js';
import { KeypairWallet } from '../wallet.js';
import { fakeAccount, fakeClient } from './test-helpers.js';

describe('StellarPaymentService.submitNativePayment', () => {
  const destination = Keypair.random().publicKey();

  it('submits a payment and returns the hash and ledger', async () => {
    const sourceKeypair = Keypair.random();
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair) });
    const service = new StellarPaymentService(client);
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const result = await service.submitNativePayment({
      sourceWallet: wallet,
      destinationPublicKey: destination,
      amount: '10',
    });

    expect(result.hash).toBe('fake-hash');
    expect(result.ledger).toBe(42);
  });

  it('wraps a load-account failure as a StellarPaymentError', async () => {
    const client = fakeClient({
      loadAccount: () => Promise.reject(new Error('network down')),
    });
    const service = new StellarPaymentService(client);
    const wallet = KeypairWallet.fromSecret('testnet', Keypair.random().secret());

    await expect(
      service.submitNativePayment({ sourceWallet: wallet, destinationPublicKey: destination, amount: '10' }),
    ).rejects.toBeInstanceOf(StellarPaymentError);
  });

  it('wraps a submit-transaction failure as a StellarPaymentError', async () => {
    const sourceKeypair = Keypair.random();
    const client = fakeClient({
      loadAccount: () => fakeAccount(sourceKeypair),
      submitTransaction: () => Promise.reject(new Error('submission failed')),
    });
    const service = new StellarPaymentService(client);
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    await expect(
      service.submitNativePayment({ sourceWallet: wallet, destinationPublicKey: destination, amount: '10' }),
    ).rejects.toBeInstanceOf(StellarPaymentError);
  });

  it('propagates a memo onto the built transaction', async () => {
    const sourceKeypair = Keypair.random();
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'h', ledger: 1 });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction });
    const service = new StellarPaymentService(client);
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    await service.submitNativePayment({
      sourceWallet: wallet,
      destinationPublicKey: destination,
      amount: '10',
      memo: 'order-42',
    });

    const submittedTx = submitTransaction.mock.calls[0]?.[0];
    expect(submittedTx.memo.value.toString()).toBe('order-42');
  });

  it('builds the payment operation with the native asset', async () => {
    const sourceKeypair = Keypair.random();
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'h', ledger: 1 });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction });
    const service = new StellarPaymentService(client);
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    await service.submitNativePayment({ sourceWallet: wallet, destinationPublicKey: destination, amount: '10' });

    const submittedTx = submitTransaction.mock.calls[0]?.[0];
    expect(submittedTx.operations[0].asset.isNative()).toBe(true);
  });
});

describe('StellarPaymentService.submitPayment (non-native asset)', () => {
  const destination = Keypair.random().publicKey();
  const issuer = Keypair.random().publicKey();

  it('builds the payment operation with the given asset code and issuer', async () => {
    const sourceKeypair = Keypair.random();
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'asset-hash', ledger: 5 });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction });
    const service = new StellarPaymentService(client);
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const result = await service.submitPayment({
      sourceWallet: wallet,
      destinationPublicKey: destination,
      amount: '25',
      asset: { code: 'MMX', issuer },
    });

    expect(result.hash).toBe('asset-hash');
    const submittedTx = submitTransaction.mock.calls[0]?.[0];
    const submittedAsset: Asset = submittedTx.operations[0].asset;
    expect(submittedAsset.isNative()).toBe(false);
    expect(submittedAsset.getCode()).toBe('MMX');
    expect(submittedAsset.getIssuer()).toBe(issuer);
  });

  it('wraps a rejected submission as a StellarPaymentError', async () => {
    const sourceKeypair = Keypair.random();
    const client = fakeClient({
      loadAccount: () => fakeAccount(sourceKeypair),
      submitTransaction: () => Promise.reject(new Error('no trustline')),
    });
    const service = new StellarPaymentService(client);
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    await expect(
      service.submitPayment({
        sourceWallet: wallet,
        destinationPublicKey: destination,
        amount: '25',
        asset: { code: 'MMX', issuer },
      }),
    ).rejects.toBeInstanceOf(StellarPaymentError);
  });
});
