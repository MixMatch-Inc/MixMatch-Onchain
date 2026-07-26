import { Keypair } from '@stellar/stellar-sdk';

/** A real, checksum-valid (but never-funded) Stellar public key for use as a payment destination in tests. */
export const DESTINATION_PUBLIC_KEY = Keypair.random().publicKey();

export function randomPublicKey(): string {
  return Keypair.random().publicKey();
}
