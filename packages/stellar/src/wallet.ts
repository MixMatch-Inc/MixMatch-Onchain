import { Keypair } from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types/index.js';

/**
 * Wallet custody model
 * ---------------------
 * This package treats a "wallet" as a thin, in-memory wrapper around a
 * Stellar `Keypair`. It is **non-custodial from this package's point of
 * view**: `KeypairWallet` never persists, encrypts, or transmits a secret
 * key on its own — it only ever holds it in memory for the lifetime of the
 * object.
 *
 * Whether (and how) a secret key is subsequently stored — e.g. encrypted at
 * rest in `apps/api`'s database, held client-side in a mobile secure
 * enclave, or never persisted at all (ephemeral signing) — is an
 * application-level decision outside this package's scope. Callers obtain a
 * secret key via `KeypairWallet.secretKey` and are responsible for handling
 * it appropriately (this package never logs it).
 *
 * The `Wallet` interface exists so calling code can depend on "something
 * that can report a public key and sign" without depending on the concrete
 * in-memory implementation — a future custodial signing service (e.g. an
 * HSM-backed signer) could implement the same interface as a drop-in
 * replacement.
 */
export interface Wallet {
  readonly network: StellarNetwork;
  readonly publicKey: string;
  /** Signs arbitrary bytes (e.g. a transaction signature payload) with this wallet's key. */
  sign(payload: Buffer): Buffer;
}

/** In-memory, keypair-backed `Wallet`. See the custody model notes above. */
export class KeypairWallet implements Wallet {
  readonly network: StellarNetwork;
  private readonly keypair: Keypair;

  constructor(network: StellarNetwork, keypair: Keypair) {
    this.network = network;
    this.keypair = keypair;
  }

  /** Generates a brand-new random keypair wallet. */
  static generate(network: StellarNetwork): KeypairWallet {
    return new KeypairWallet(network, Keypair.random());
  }

  /** Rehydrates a wallet from a previously-stored Stellar secret key (e.g. `SDAK...`). */
  static fromSecret(network: StellarNetwork, secretKey: string): KeypairWallet {
    return new KeypairWallet(network, Keypair.fromSecret(secretKey));
  }

  get publicKey(): string {
    return this.keypair.publicKey();
  }

  /**
   * The Stellar-encoded secret key (e.g. `SDAK...`).
   *
   * Exposed only so the caller can persist/encrypt it under their own
   * custody model — this package itself never stores or logs it.
   */
  get secretKey(): string {
    return this.keypair.secret();
  }

  sign(payload: Buffer): Buffer {
    return this.keypair.sign(payload);
  }
}
