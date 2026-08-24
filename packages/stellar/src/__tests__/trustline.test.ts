import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { StellarPaymentError } from '../payment-errors.js';
import { establishTrustline } from '../trustline.js';
import { KeypairWallet } from '../wallet.js';
import { fakeAccount, fakeClient } from './test-helpers.js';

describe('establishTrustline', () => {
  const issuer = Keypair.random().publicKey();

  it('submits a changeTrust operation for the given asset', async () => {
    const sourceKeypair = Keypair.random();
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'trust-hash', ledger: 7 });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const result = await establishTrustline({
      client,
      wallet,
      asset: { code: 'MMX', issuer },
    });

    expect(result.hash).toBe('trust-hash');
    const submittedTx = submitTransaction.mock.calls[0]?.[0];
    expect(submittedTx.operations[0].type).toBe('changeTrust');
    expect(submittedTx.operations[0].line.getCode()).toBe('MMX');
    expect(submittedTx.operations[0].line.getIssuer()).toBe(issuer);
  });

  it('passes an explicit limit through to the operation', async () => {
    const sourceKeypair = Keypair.random();
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'h', ledger: 1 });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    await establishTrustline({ client, wallet, asset: { code: 'MMX', issuer }, limit: '1000' });

    const submittedTx = submitTransaction.mock.calls[0]?.[0];
    expect(submittedTx.operations[0].limit).toBe('1000.0000000');
  });

  it('wraps a load-account failure as a StellarPaymentError', async () => {
    const client = fakeClient({ loadAccount: () => Promise.reject(new Error('network down')) });
    const wallet = KeypairWallet.fromSecret('testnet', Keypair.random().secret());

    await expect(
      establishTrustline({ client, wallet, asset: { code: 'MMX', issuer } }),
    ).rejects.toBeInstanceOf(StellarPaymentError);
  });

  it('wraps a submit-transaction failure as a StellarPaymentError', async () => {
    const sourceKeypair = Keypair.random();
    const client = fakeClient({
      loadAccount: () => fakeAccount(sourceKeypair),
      submitTransaction: () => Promise.reject(new Error('issuer does not exist')),
    });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    await expect(
      establishTrustline({ client, wallet, asset: { code: 'MMX', issuer } }),
    ).rejects.toBeInstanceOf(StellarPaymentError);
  });
});
