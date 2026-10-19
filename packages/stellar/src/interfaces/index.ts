import type { Horizon, rpc } from '@stellar/stellar-sdk';
import type { StellarNetwork } from '../types/index.js';

/** A configured Stellar client: the Horizon and Soroban RPC connections for a single network. */
export interface StellarClient {
  readonly horizon: Horizon.Server;
  readonly soroban: rpc.Server;
  readonly networkPassphrase: string;
  getNetwork(): StellarNetwork;
}
