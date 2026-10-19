import type { StellarNetwork } from './types/index.js';

export interface StellarConfig {
  network: StellarNetwork;
  horizonUrl: string;
  rpcUrl: string;
  /** Deployed id of the escrow contract (see contracts/escrow) on this network, if configured. */
  escrowContractId?: string;
}

const NETWORK_DEFAULTS: Record<StellarNetwork, { horizonUrl: string; rpcUrl: string }> = {
  testnet: {
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet.stellar.org',
  },
  public: {
    horizonUrl: 'https://horizon.stellar.org',
    rpcUrl: 'https://mainnet.sorobanrpc.com',
  },
};

const VALID_NETWORKS: readonly StellarNetwork[] = ['testnet', 'public'];

/** Unset defaults to testnet; any other value must be a known network, so a typo can never silently select the wrong one. */
export function parseNetwork(raw: string | undefined): StellarNetwork {
  const value = raw?.trim();
  if (!value) return 'testnet';
  if ((VALID_NETWORKS as readonly string[]).includes(value)) return value as StellarNetwork;
  throw new Error(`Unknown STELLAR_NETWORK "${value}". Valid values: ${VALID_NETWORKS.join(', ')}.`);
}

/** Builds a `StellarConfig` from environment variables, falling back to sensible network defaults. */
export function loadStellarConfig(env: NodeJS.ProcessEnv = process.env): StellarConfig {
  const network = parseNetwork(env.STELLAR_NETWORK);
  const defaults = NETWORK_DEFAULTS[network];

  return {
    network,
    horizonUrl: env.STELLAR_HORIZON_URL?.trim() || defaults.horizonUrl,
    rpcUrl: env.STELLAR_RPC_URL?.trim() || defaults.rpcUrl,
    escrowContractId: env.STELLAR_ESCROW_CONTRACT_ID?.trim() || undefined,
  };
}
