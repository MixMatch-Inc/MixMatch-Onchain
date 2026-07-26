import { Account, Networks, TransactionFailedError, type Horizon } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import type { DefaultStellarClient } from './client.js';
import { KeypairWallet } from './wallet.js';
import { StellarPaymentService, type StellarPaymentResult } from './payment.js';
import { StellarPaymentError } from './payment-errors.js';

function fakeClient(overrides: {
  loadAccount?: (id: string) => Promise<unknown>;
  submitTransaction?: (tx: unknown) => Promise<unknown>;
}): DefaultStellarClient {
  const loadAccount = overrides.loadAccount ?? (async (id: string) => new Account(id, '100'));
  const submitTransaction =
    overrides.submitTransaction ??
    (async () => ({ hash: 'fake-hash', ledger: 1, successful: true }));

  return {
    config: {
      network: 'testnet',
      networkPassphrase: Networks.TESTNET,
      horizonUrl: 'https://horizon-testnet.stellar.org',
      rpcUrl: 'https://soroban-testnet.stellar.org',
    },
    horizon: { loadAccount, submitTransaction } as unknown as Horizon.Server,
  } as unknown as DefaultStellarClient;
}

describe('StellarPaymentService.submitNativePayment', () => {
  it('builds, signs, and submits a native payment, returning the mapped result', async () => {
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'tx-hash-1', ledger: 42, successful: true });
    const client = fakeClient({ submitTransaction });
    const service = new StellarPaymentService(client);
    const sourceWallet = KeypairWallet.generate('testnet');

    const result = await service.submitNativePayment({
      sourceWallet,
      destinationPublicKey: KeypairWallet.generate('testnet').publicKey,
      amount: '10',
    });

    expect(result).toEqual<StellarPaymentResult>({ hash: 'tx-hash-1', ledger: 42, successful: true });
    expect(submitTransaction).toHaveBeenCalledTimes(1);
  });

  it('signs the transaction with a signature the source wallet can be verified against', async () => {
    let submittedTx: { signatures: unknown[] } | undefined;
    const client = fakeClient({
      submitTransaction: async (tx) => {
        submittedTx = tx as { signatures: unknown[] };
        return { hash: 'tx-hash', ledger: 1, successful: true };
      },
    });
    const service = new StellarPaymentService(client);
    const sourceWallet = KeypairWallet.generate('testnet');

    await service.submitNativePayment({
      sourceWallet,
      destinationPublicKey: KeypairWallet.generate('testnet').publicKey,
      amount: '1',
    });

    expect(submittedTx?.signatures).toHaveLength(1);
  });

  it('rejects with source_account_not_found when the source account is unfunded', async () => {
    const client = fakeClient({
      loadAccount: async () => {
        const { NotFoundError } = await import('@stellar/stellar-sdk');
        throw new NotFoundError('Not Found', {});
      },
    });
    const service = new StellarPaymentService(client);

    await expect(
      service.submitNativePayment({
        sourceWallet: KeypairWallet.generate('testnet'),
        destinationPublicKey: KeypairWallet.generate('testnet').publicKey,
        amount: '10',
      }),
    ).rejects.toMatchObject({ kind: 'source_account_not_found' });
  });

  it('rejects with a classified StellarPaymentError when submission fails', async () => {
    const client = fakeClient({
      submitTransaction: async () => {
        throw new TransactionFailedError('Transaction Failed', {
          data: { extras: { result_codes: { transaction: 'tx_failed', operations: ['op_underfunded'] } } },
        });
      },
    });
    const service = new StellarPaymentService(client);

    await expect(
      service.submitNativePayment({
        sourceWallet: KeypairWallet.generate('testnet'),
        destinationPublicKey: KeypairWallet.generate('testnet').publicKey,
        amount: '10',
      }),
    ).rejects.toBeInstanceOf(StellarPaymentError);
  });

  describe('idempotency', () => {
    it('returns the same result for concurrent calls sharing an idempotency key without double-submitting', async () => {
      let resolveSubmit!: (value: unknown) => void;
      const submitTransaction = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveSubmit = resolve;
          }),
      );
      const client = fakeClient({ submitTransaction });
      const service = new StellarPaymentService(client);
      const sourceWallet = KeypairWallet.generate('testnet');
      const params = {
        sourceWallet,
        destinationPublicKey: KeypairWallet.generate('testnet').publicKey,
        amount: '5',
        idempotencyKey: 'payment-123',
      };

      const first = service.submitNativePayment(params);
      const second = service.submitNativePayment(params);

      // Let the pending `loadAccount` await resolve so `buildAndSubmit`
      // actually reaches (and invokes) `submitTransaction` before we resolve it.
      await new Promise((resolve) => setTimeout(resolve, 0));
      resolveSubmit({ hash: 'shared-hash', ledger: 7, successful: true });

      const [firstResult, secondResult] = await Promise.all([first, second]);

      expect(submitTransaction).toHaveBeenCalledTimes(1);
      expect(firstResult).toBe(secondResult);
    });

    it('does not dedupe submissions without an idempotency key', async () => {
      const submitTransaction = vi
        .fn()
        .mockResolvedValue({ hash: 'tx-hash', ledger: 1, successful: true });
      const client = fakeClient({ submitTransaction });
      const service = new StellarPaymentService(client);
      const params = {
        sourceWallet: KeypairWallet.generate('testnet'),
        destinationPublicKey: KeypairWallet.generate('testnet').publicKey,
        amount: '5',
      };

      await service.submitNativePayment(params);
      await service.submitNativePayment(params);

      expect(submitTransaction).toHaveBeenCalledTimes(2);
    });

    it('allows a fresh submission after a prior attempt with the same key failed', async () => {
      const submitTransaction = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient network failure'))
        .mockResolvedValueOnce({ hash: 'tx-hash-2', ledger: 2, successful: true });
      const client = fakeClient({ submitTransaction });
      const service = new StellarPaymentService(client);
      const params = {
        sourceWallet: KeypairWallet.generate('testnet'),
        destinationPublicKey: KeypairWallet.generate('testnet').publicKey,
        amount: '5',
        idempotencyKey: 'payment-retry',
      };

      await expect(service.submitNativePayment(params)).rejects.toThrow();

      // Give the internal `.catch()` eviction a tick to run before retrying.
      await new Promise((resolve) => setTimeout(resolve, 0));

      const result = await service.submitNativePayment(params);

      expect(submitTransaction).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ hash: 'tx-hash-2', ledger: 2, successful: true });
    });

    it('returns the same successful result for a second call with the same key made after completion', async () => {
      const submitTransaction = vi
        .fn()
        .mockResolvedValue({ hash: 'only-once', ledger: 3, successful: true });
      const client = fakeClient({ submitTransaction });
      const service = new StellarPaymentService(client);
      const params = {
        sourceWallet: KeypairWallet.generate('testnet'),
        destinationPublicKey: KeypairWallet.generate('testnet').publicKey,
        amount: '5',
        idempotencyKey: 'payment-stable',
      };

      const first = await service.submitNativePayment(params);
      const second = await service.submitNativePayment(params);

      expect(submitTransaction).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });
  });
});
