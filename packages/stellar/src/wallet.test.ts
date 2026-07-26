import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { KeypairWallet } from './wallet.js';

describe('KeypairWallet', () => {
  it('generates a wallet with a valid Stellar public key', () => {
    const wallet = KeypairWallet.generate('testnet');

    expect(wallet.network).toBe('testnet');
    expect(wallet.publicKey).toMatch(/^G[A-Z0-9]{55}$/);
    expect(wallet.secretKey).toMatch(/^S[A-Z0-9]{55}$/);
  });

  it('produces a different keypair on every call', () => {
    const a = KeypairWallet.generate('testnet');
    const b = KeypairWallet.generate('testnet');

    expect(a.publicKey).not.toBe(b.publicKey);
  });

  it('rehydrates the same wallet from a stored secret key', () => {
    const original = KeypairWallet.generate('testnet');
    const rehydrated = KeypairWallet.fromSecret('testnet', original.secretKey);

    expect(rehydrated.publicKey).toBe(original.publicKey);
  });

  it('signs data verifiably with the underlying keypair', () => {
    const wallet = KeypairWallet.generate('testnet');
    const payload = Buffer.from('hello stellar');

    const signature = wallet.sign(payload);

    const verifier = Keypair.fromPublicKey(wallet.publicKey);
    expect(verifier.verify(payload, signature)).toBe(true);
  });

  it('never signs correctly against a mismatched payload', () => {
    const wallet = KeypairWallet.generate('testnet');
    const signature = wallet.sign(Buffer.from('original'));

    const verifier = Keypair.fromPublicKey(wallet.publicKey);
    expect(verifier.verify(Buffer.from('tampered'), signature)).toBe(false);
  });
});
