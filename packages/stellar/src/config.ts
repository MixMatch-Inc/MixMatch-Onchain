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

function parseNetwork(raw: string | undefined): StellarNetwork {
  if (raw === 'public') return 'public';
  return 'testnet';
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
