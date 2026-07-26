import { Networks } from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types/index.js';

/** Resolved configuration needed to talk to Horizon and Soroban RPC for a given network. */
export interface StellarConfig {
  network: StellarNetwork;
  /** Network passphrase used to sign/submit transactions on this network. */
  networkPassphrase: string;
  /** Horizon (classic API) endpoint. */
  horizonUrl: string;
  /** Soroban RPC endpoint. */
  rpcUrl: string;
}

interface NetworkDefaults {
  networkPassphrase: string;
  horizonUrl: string;
  rpcUrl: string;
}

const NETWORK_DEFAULTS: Record<StellarNetwork, NetworkDefaults> = {
  testnet: {
    networkPassphrase: Networks.TESTNET,
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet.stellar.org',
  },
  public: {
    networkPassphrase: Networks.PUBLIC,
    horizonUrl: 'https://horizon.stellar.org',
    rpcUrl: 'https://mainnet.sorobanrpc.com',
  },
};

function isStellarNetwork(value: string): value is StellarNetwork {
  return value === 'testnet' || value === 'public';
}

/**
 * Builds Stellar configuration from environment variables, matching
 * `apps/api`'s `STELLAR_NETWORK`/`RPC_URL` variables (see `docs/ENVIRONMENT.md`
 * and `apps/docs/env-integration.md`).
 *
 * `RPC_URL`/`HORIZON_URL` are optional overrides; if unset, sensible defaults
 * for the selected network are used. An `env` object can be passed in for
 * testing instead of reading `process.env` directly.
 */
export function loadStellarConfig(env: NodeJS.ProcessEnv = process.env): StellarConfig {
  const rawNetwork = env.STELLAR_NETWORK ?? 'testnet';
  if (!isStellarNetwork(rawNetwork)) {
    throw new Error(`Invalid STELLAR_NETWORK: "${rawNetwork}". Expected "testnet" or "public".`);
  }

  const defaults = NETWORK_DEFAULTS[rawNetwork];

  return {
    network: rawNetwork,
    networkPassphrase: defaults.networkPassphrase,
    horizonUrl: env.HORIZON_URL ?? defaults.horizonUrl,
    rpcUrl: env.RPC_URL ?? defaults.rpcUrl,
  };
}
