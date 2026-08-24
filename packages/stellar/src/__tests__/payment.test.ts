import { Keypair, Networks } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import type { DefaultStellarClient } from '../client.js';
import { StellarPaymentError } from '../payment-errors.js';
import { StellarPaymentService } from '../payment.js';
import { KeypairWallet } from '../wallet.js';

function fakeClient(overrides: {
  loadAccount?: () => unknown;
  submitTransaction?: () => unknown;
}): DefaultStellarClient {
  const sourceKeypair = Keypair.random();
  return {
    networkPassphrase: Networks.TESTNET,
    horizon: {
      loadAccount:
        overrides.loadAccount ??
        (() => ({
          accountId: () => sourceKeypair.publicKey(),
          sequenceNumber: () => '1',
          incrementSequenceNumber: () => {},
        })),
      submitTransaction: overrides.submitTransaction ?? (() => Promise.resolve({ hash: 'fake-hash', ledger: 42 })),
    },
  } as unknown as DefaultStellarClient;
}

describe('StellarPaymentService.submitNativePayment', () => {
  const destination = Keypair.random().publicKey();

  it('submits a payment and returns the hash and ledger', async () => {
    const sourceKeypair = Keypair.random();
    const client = fakeClient({
      loadAccount: () =>
        Promise.resolve({
          accountId: () => sourceKeypair.publicKey(),
          sequenceNumber: () => '1',
          incrementSequenceNumber: () => {},
        }),
    });
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
      loadAccount: () =>
        Promise.resolve({
          accountId: () => sourceKeypair.publicKey(),
          sequenceNumber: () => '1',
          incrementSequenceNumber: () => {},
        }),
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
    const client = fakeClient({
      loadAccount: () =>
        Promise.resolve({
          accountId: () => sourceKeypair.publicKey(),
          sequenceNumber: () => '1',
          incrementSequenceNumber: () => {},
        }),
      submitTransaction,
    });
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
});
