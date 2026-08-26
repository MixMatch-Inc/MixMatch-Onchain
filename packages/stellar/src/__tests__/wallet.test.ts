import { Account, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { KeypairWallet, VaultWallet } from '../wallet.js';

function buildTestTransaction(sourcePublicKey: string) {
  const account = new Account(sourcePublicKey, '0');
  return new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.bumpSequence({ bumpTo: '1' }))
    .setTimeout(30)
    .build();
}

describe('KeypairWallet', () => {
  it('exposes the public key derived from the secret', () => {
    const keypair = Keypair.random();
    const wallet = KeypairWallet.fromSecret('testnet', keypair.secret());

    expect(wallet.publicKey).toBe(keypair.publicKey());
    expect(wallet.network).toBe('testnet');
  });

  it('sign() appends a valid signature for its own key to the transaction', async () => {
    const keypair = Keypair.random();
    const wallet = KeypairWallet.fromSecret('testnet', keypair.secret());
    const transaction = buildTestTransaction(keypair.publicKey());

    await wallet.sign(transaction);

    expect(transaction.signatures).toHaveLength(1);
    expect(keypair.verify(transaction.hash(), transaction.signatures[0]!.signature())).toBe(true);
  });

  it('throws for a malformed secret key', () => {
    expect(() => KeypairWallet.fromSecret('testnet', 'not-a-real-secret')).toThrow();
  });
});

describe('VaultWallet', () => {
  it('sign() requests a signature over the transaction hash and appends it via addSignature', async () => {
    const keypair = Keypair.random();
    const signer = {
      sign: vi.fn(async (_keyName: string, data: Buffer) => keypair.sign(data)),
    };
    const wallet = new VaultWallet('testnet', keypair.publicKey(), 'account-1', signer);
    const transaction = buildTestTransaction(keypair.publicKey());

    await wallet.sign(transaction);

    expect(signer.sign).toHaveBeenCalledWith('account-1', transaction.hash());
    expect(transaction.signatures).toHaveLength(1);
    expect(keypair.verify(transaction.hash(), transaction.signatures[0]!.signature())).toBe(true);
  });

  it('rejects a signature that does not match the wallet public key', async () => {
    const keypair = Keypair.random();
    const wrongSigner = Keypair.random();
    const signer = { sign: vi.fn(async (_keyName: string, data: Buffer) => wrongSigner.sign(data)) };
    const wallet = new VaultWallet('testnet', keypair.publicKey(), 'account-1', signer);
    const transaction = buildTestTransaction(keypair.publicKey());

    await expect(wallet.sign(transaction)).rejects.toThrow();
  });
});
