import { Keypair, Transaction } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { StellarPaymentError } from '../payment-errors.js';
import { buildHighValuePaymentEnvelope, coSignAndSubmitEnvelope, configureMultisig } from '../multisig.js';
import { KeypairWallet } from '../wallet.js';
import { fakeAccount, fakeClient } from './test-helpers.js';

describe('configureMultisig', () => {
  it('submits a setOptions operation adding the admin signer and setting thresholds', async () => {
    const sourceKeypair = Keypair.random();
    const adminPublicKey = Keypair.random().publicKey();
    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'config-hash', ledger: 10 });
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair), submitTransaction });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const result = await configureMultisig({ client, wallet, adminPublicKey });

    expect(result.hash).toBe('config-hash');
    const submittedTx = submitTransaction.mock.calls[0]?.[0];
    const op = submittedTx.operations[0];
    expect(op.type).toBe('setOptions');
    expect(op.signer.ed25519PublicKey).toBe(adminPublicKey);
    expect(op.signer.weight).toBe(1);
    expect(op.masterWeight).toBe(1);
    expect(op.lowThreshold).toBe(1);
    expect(op.medThreshold).toBe(1);
    expect(op.highThreshold).toBe(2);
  });

  it('wraps a submission failure as a StellarPaymentError', async () => {
    const sourceKeypair = Keypair.random();
    const client = fakeClient({
      loadAccount: () => fakeAccount(sourceKeypair),
      submitTransaction: () => Promise.reject(new Error('network down')),
    });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    await expect(
      configureMultisig({ client, wallet, adminPublicKey: Keypair.random().publicKey() }),
    ).rejects.toBeInstanceOf(StellarPaymentError);
  });
});

describe('buildHighValuePaymentEnvelope', () => {
  it('builds a payment + masterWeight-asserting setOptions operation, signed only by the source wallet', async () => {
    const sourceKeypair = Keypair.random();
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair) });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());
    const destination = Keypair.random().publicKey();

    const { envelopeXdr } = await buildHighValuePaymentEnvelope({
      client,
      sourceWallet: wallet,
      destinationPublicKey: destination,
      amount: '500',
    });

    const transaction = new Transaction(envelopeXdr, client.networkPassphrase);
    expect(transaction.operations).toHaveLength(2);
    expect(transaction.operations[0]?.type).toBe('payment');
    expect(transaction.operations[1]?.type).toBe('setOptions');
    expect((transaction.operations[1] as { masterWeight?: number }).masterWeight).toBe(1);
    expect(transaction.signatures).toHaveLength(1);
  });

  it('includes a memo when provided', async () => {
    const sourceKeypair = Keypair.random();
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair) });
    const wallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const { envelopeXdr } = await buildHighValuePaymentEnvelope({
      client,
      sourceWallet: wallet,
      destinationPublicKey: Keypair.random().publicKey(),
      amount: '500',
      memo: 'high-value-1',
    });

    const transaction = new Transaction(envelopeXdr, client.networkPassphrase);
    expect(transaction.memo.value?.toString()).toBe('high-value-1');
  });

  it('wraps a load-account failure as a StellarPaymentError', async () => {
    const client = fakeClient({ loadAccount: () => Promise.reject(new Error('not found')) });
    const wallet = KeypairWallet.fromSecret('testnet', Keypair.random().secret());

    await expect(
      buildHighValuePaymentEnvelope({
        client,
        sourceWallet: wallet,
        destinationPublicKey: Keypair.random().publicKey(),
        amount: '500',
      }),
    ).rejects.toBeInstanceOf(StellarPaymentError);
  });
});

describe('coSignAndSubmitEnvelope', () => {
  it('adds the admin signature and submits', async () => {
    const sourceKeypair = Keypair.random();
    const adminKeypair = Keypair.random();
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair) });
    const sourceWallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());
    const adminWallet = KeypairWallet.fromSecret('testnet', adminKeypair.secret());

    const { envelopeXdr } = await buildHighValuePaymentEnvelope({
      client,
      sourceWallet,
      destinationPublicKey: Keypair.random().publicKey(),
      amount: '500',
    });

    const submitTransaction = vi.fn().mockResolvedValue({ hash: 'final-hash', ledger: 20 });
    const submittingClient = fakeClient({ submitTransaction });

    const result = await coSignAndSubmitEnvelope({ client: submittingClient, envelopeXdr, adminWallet });

    expect(result.hash).toBe('final-hash');
    const submittedTx: Transaction = submitTransaction.mock.calls[0]?.[0];
    expect(submittedTx.signatures).toHaveLength(2);
  });

  it('wraps a submission failure (e.g. only one signature present) as a StellarPaymentError', async () => {
    const sourceKeypair = Keypair.random();
    const client = fakeClient({ loadAccount: () => fakeAccount(sourceKeypair) });
    const sourceWallet = KeypairWallet.fromSecret('testnet', sourceKeypair.secret());

    const { envelopeXdr } = await buildHighValuePaymentEnvelope({
      client,
      sourceWallet,
      destinationPublicKey: Keypair.random().publicKey(),
      amount: '500',
    });

    const submittingClient = fakeClient({
      submitTransaction: () =>
        Promise.reject(new Error('tx_failed: op_bad_auth')),
    });

    await expect(
      coSignAndSubmitEnvelope({
        client: submittingClient,
        envelopeXdr,
        adminWallet: KeypairWallet.fromSecret('testnet', Keypair.random().secret()),
      }),
    ).rejects.toBeInstanceOf(StellarPaymentError);
  });
});
