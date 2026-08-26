import { Keypair, Transaction } from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types/index.js';

/**
 * Signing capability for a single Stellar account. Kept as an interface
 * (rather than exposing `Keypair` directly everywhere) so callers depend
 * on "something that can sign a transaction," never on how — or whether —
 * this implementation holds key material locally. `sign` is async
 * specifically so a remote/KMS-backed signer (see `VaultWallet`) can fit
 * the same shape as a local one: it never needs to expose a `Keypair` at
 * all, so no caller can accidentally extract raw key material through
 * this interface.
 */
export interface Wallet {
  readonly network: StellarNetwork;
  readonly publicKey: string;
  /** Signs `transaction` in place (appends a signature), whatever that requires for this wallet. */
  sign(transaction: Transaction): Promise<void>;
}

/**
 * A wallet backed by a plaintext in-memory Stellar secret key.
 *
 * @deprecated Kept only for the legacy `stellar_accounts` rows created
 * before this platform moved signing keys into Vault (see
 * `apps/api/src/modules/payments/README.md`'s "Wallet custody" section).
 * Every new account is signed via `VaultWallet` instead — construct this
 * only for a row that still has a non-null `encryptedSecretKey`.
 */
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

  sign(transaction: Transaction): Promise<void> {
    transaction.sign(this.keypair);
    return Promise.resolve();
  }
}

/**
 * Signs by calling out to a remote signer (e.g. `@mixmatch/kms`'s
 * `VaultTransitClient`) that holds the actual key material — this process
 * never sees it, not even transiently. `RemoteSigner` is intentionally
 * minimal and KMS-agnostic so `packages/stellar` doesn't need to depend on
 * `@mixmatch/kms`; any object with a matching `sign` method satisfies it
 * structurally.
 */
export interface RemoteSigner {
  /** Signs `data` with the named key, returning the raw 64-byte ed25519 signature. */
  sign(keyName: string, data: Buffer): Promise<Buffer>;
}

export class VaultWallet implements Wallet {
  constructor(
    readonly network: StellarNetwork,
    readonly publicKey: string,
    private readonly keyName: string,
    private readonly signer: RemoteSigner,
  ) {}

  async sign(transaction: Transaction): Promise<void> {
    const signature = await this.signer.sign(this.keyName, transaction.hash());
    // Self-validating: addSignature verifies the signature against
    // `publicKey` before appending it, so a mismatched/corrupt remote
    // signature throws here rather than producing a silently-invalid
    // transaction.
    transaction.addSignature(this.publicKey, signature.toString('base64'));
  }
}
