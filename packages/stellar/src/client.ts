import { Horizon, Networks, rpc } from '@stellar/stellar-sdk';
import { loadStellarConfig, type StellarConfig } from './config.js';
import type { StellarClient } from './interfaces/index.js';

const PASSPHRASE_BY_NETWORK: Record<StellarConfig['network'], string> = {
  testnet: Networks.TESTNET,
  public: Networks.PUBLIC,
};

/**
 * Concrete `StellarClient`: owns a configured Horizon server and Soroban RPC
 * server for a single network, built from `StellarConfig`.
 */
export class DefaultStellarClient implements StellarClient {
  readonly config: StellarConfig;
  readonly horizon: Horizon.Server;
  readonly soroban: rpc.Server;
  readonly networkPassphrase: string;

  constructor(config: StellarConfig) {
    this.config = config;
    this.networkPassphrase = PASSPHRASE_BY_NETWORK[config.network];
    // `allowHttp` stays false (default): both testnet and public endpoints are HTTPS.
    this.horizon = new Horizon.Server(config.horizonUrl);
    this.soroban = new rpc.Server(config.rpcUrl);
  }

  getNetwork(): StellarConfig['network'] {
    return this.config.network;
  }
}

/**
 * Builds a `DefaultStellarClient` from environment variables (or an
 * explicitly-provided `StellarConfig`, e.g. for tests).
 */
export function createStellarClient(config: StellarConfig = loadStellarConfig()): DefaultStellarClient {
  return new DefaultStellarClient(config);
}
