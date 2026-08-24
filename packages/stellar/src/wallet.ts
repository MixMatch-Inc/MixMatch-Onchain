import { Keypair } from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types/index.js';

/**
 * Signing capability for a single Stellar account. Kept as an interface
 * (rather than exposing `Keypair` directly everywhere) so callers depend on
 * "something that can sign," not on how the secret key is held — this is
 * the seam a future non-custodial or KMS-backed signer implementation would
 * plug into without changing `StellarPaymentService`.
 */
export interface Wallet {
  readonly network: StellarNetwork;
  readonly publicKey: string;
  getKeypair(): Keypair;
}

/** A wallet backed by a plaintext in-memory Stellar secret key. */
export class KeypairWallet implements Wallet {
  readonly network: StellarNetwork;
  readonly publicKey: string;
  private readonly keypair: Keypair;

  private constructor(network: StellarNetwork, keypair: Keypair) {
    this.network = network;
    this.keypair = keypair;
    this.publicKey = keypair.publicKey();
  }

  static fromSecret(network: StellarNetwork, secretKey: string): KeypairWallet {
    return new KeypairWallet(network, Keypair.fromSecret(secretKey));
  }

  getKeypair(): Keypair {
    return this.keypair;
  }
}
