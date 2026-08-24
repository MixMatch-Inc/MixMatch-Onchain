/** Stellar network the platform can connect to. */
export type StellarNetwork = 'testnet' | 'public';

/** Reference to a Stellar account: which network it lives on, and its public key. */
export interface StellarAccountRef {
  network: StellarNetwork;
  publicKey: string;
}
