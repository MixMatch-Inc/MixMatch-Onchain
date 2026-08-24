import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { KeypairWallet } from '../wallet.js';

describe('KeypairWallet', () => {
  it('exposes the public key derived from the secret', () => {
    const keypair = Keypair.random();
    const wallet = KeypairWallet.fromSecret('testnet', keypair.secret());

    expect(wallet.publicKey).toBe(keypair.publicKey());
    expect(wallet.network).toBe('testnet');
  });

  it('getKeypair() returns a keypair that can sign', () => {
    const keypair = Keypair.random();
    const wallet = KeypairWallet.fromSecret('testnet', keypair.secret());

    const signature = wallet.getKeypair().sign(Buffer.from('test-payload'));
    expect(signature).toBeInstanceOf(Buffer);
    expect(wallet.getKeypair().publicKey()).toBe(keypair.publicKey());
  });

  it('throws for a malformed secret key', () => {
    expect(() => KeypairWallet.fromSecret('testnet', 'not-a-real-secret')).toThrow();
  });
});
