/**
 * Core type definitions for the Stellar integration layer.
 */

/** Stellar network the platform can connect to (matches `apps/api`'s `env.stellarNetwork`). */
export type StellarNetwork = 'testnet' | 'public';

/** Reference to a Stellar account: which network it lives on, and its public key. */
export interface StellarAccountRef {
  network: StellarNetwork;
  publicKey: string;
}
