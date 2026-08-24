import { Keypair } from '@stellar/stellar-sdk';

export interface GeneratedStellarAccount {
  publicKey: string;
  wallet: { secretKey: string };
}

/** Generates a brand-new Stellar keypair. Does not fund or register it on-chain. */
export function generateStellarAccount(): GeneratedStellarAccount {
  const keypair = Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    wallet: { secretKey: keypair.secret() },
  };
}
