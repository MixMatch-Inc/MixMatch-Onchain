/** Stellar network the platform can connect to. */
export type StellarNetwork = 'testnet' | 'public';

/** Reference to a Stellar account: which network it lives on, and its public key. */
export interface StellarAccountRef {
  network: StellarNetwork;
  publicKey: string;
}

/**
 * A non-native Stellar asset (a 1-12 character asset code plus its issuing
 * account's public key). Omit this everywhere a payment/trustline function
 * accepts an optional asset to mean "native XLM" instead.
 */
export interface StellarAssetRef {
  code: string;
  issuer: string;
}
