import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { generateStellarAccount } from '../account.js';

describe('generateStellarAccount', () => {
  it('generates a valid, unique keypair', () => {
    const a = generateStellarAccount();
    const b = generateStellarAccount();

    expect(a.publicKey).not.toBe(b.publicKey);
    expect(a.publicKey.startsWith('G')).toBe(true);
    expect(a.publicKey).toHaveLength(56);
  });

  it('produces a secret key that round-trips through Keypair.fromSecret', () => {
    const account = generateStellarAccount();
    const keypair = Keypair.fromSecret(account.wallet.secretKey);
    expect(keypair.publicKey()).toBe(account.publicKey);
  });
});
