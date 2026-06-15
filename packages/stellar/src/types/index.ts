/**
 * Placeholder type definitions for the future Stellar integration layer.
 *
 * No blockchain functionality is implemented yet. These types exist only to
 * establish naming conventions and a stable import path (`@mixmatch/stellar`)
 * for future work.
 */

/** Identifier for a Stellar network the platform may connect to in the future. */
export type StellarNetwork = 'testnet' | 'mainnet';

/** Placeholder shape for a future Stellar account reference. */
export interface StellarAccountRef {
  network: StellarNetwork;
  publicKey: string;
}
