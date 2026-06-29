import type { StellarAccountRef } from '../types/index.js';

/**
 * Placeholder interface for a future Stellar client.
 *
 * This package is a scaffold only: it defines naming and shape conventions
 * for upcoming Stellar functionality without implementing any SDK calls,
 * wallets, transactions, or network access.
 */
export interface StellarClient {
  getNetwork(): StellarAccountRef['network'];
}
