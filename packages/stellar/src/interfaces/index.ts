import type { StellarAccountRef } from '../types/index.js';

/**
 * A configured Stellar client: wraps the Horizon and Soroban RPC connections
 * for a single network.
 */
export interface StellarClient {
  getNetwork(): StellarAccountRef['network'];
}
