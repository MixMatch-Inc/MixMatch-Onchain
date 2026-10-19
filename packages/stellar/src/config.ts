import { StrKey } from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types/index.js';

export interface StellarConfig {
  network: StellarNetwork;
  horizonUrl: string;
  rpcUrl: string;
  /** Deployed id of the escrow contract (see contracts/escrow) on this network, if configured. */
  escrowContractId?: string;
  /** Network passphrase override. Required for custom networks; defaults to the network's standard passphrase. */
  networkPassphrase?: string;
  /** Permit plain-`http` endpoints (e.g. a local Quickstart node). Defaults to true only for `standalone`. */
  allowHttp?: boolean;
  /** Request timeout in milliseconds for Horizon and Soroban RPC calls. Defaults to 30000. */
  timeoutMs?: number;
  /** Sent as the `X-App-Name` / `X-App-Version` headers on Horizon requests. */
  appName?: string;
  appVersion?: string;
  /** Extra attempts made by `verifyNetwork` when an endpoint is unreachable. Defaults to 2. */
  retries?: number;
}

/**
 * Default endpoints per network. Override any of them with
 * `STELLAR_HORIZON_URL` / `STELLAR_RPC_URL`.
 *
 * Provider choice: testnet and futurenet use the Stellar Development
 * Foundation's public endpoints. The public-network RPC default is a
 * third-party provider (SDF does not host a public mainnet RPC); production
 * deployments should point `STELLAR_RPC_URL` at a provider they have an
 * agreement with. `standalone` targets the local Stellar Quickstart image
 * (`docker run -p 8000:8000 stellar/quickstart --standalone`).
 */
export const NETWORK_DEFAULTS: Record<StellarNetwork, { horizonUrl: string; rpcUrl: string }> = {
  testnet: {
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet.stellar.org',
  },
  public: {
    horizonUrl: 'https://horizon.stellar.org',
    rpcUrl: 'https://mainnet.sorobanrpc.com',
  },
  futurenet: {
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    rpcUrl: 'https://rpc-futurenet.stellar.org',
  },
  standalone: {
    horizonUrl: 'http://localhost:8000',
    rpcUrl: 'http://localhost:8000/rpc',
  },
};

function parseNetwork(raw: string | undefined): StellarNetwork {
  if (raw === 'public' || raw === 'futurenet' || raw === 'standalone') return raw;
  return 'testnet';
}

function parseUrl(name: string, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL, got "${value}"`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${name} must use http or https, got "${value}"`);
  }
  return value;
}

function parsePositiveInt(name: string, value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer, got "${value}"`);
  }
  return parsed;
}

/** Builds a `StellarConfig` from environment variables, falling back to sensible network defaults. Throws on invalid URLs or contract ids. */
export function loadStellarConfig(env: NodeJS.ProcessEnv = process.env): StellarConfig {
  const network = parseNetwork(env.STELLAR_NETWORK);
  const defaults = NETWORK_DEFAULTS[network];

  const escrowContractId = env.STELLAR_ESCROW_CONTRACT_ID?.trim() || undefined;
  if (escrowContractId && !StrKey.isValidContract(escrowContractId)) {
    throw new Error(`STELLAR_ESCROW_CONTRACT_ID must be a valid contract id (C...), got "${escrowContractId}"`);
  }

  return {
    network,
    horizonUrl: parseUrl('STELLAR_HORIZON_URL', env.STELLAR_HORIZON_URL?.trim() || defaults.horizonUrl),
    rpcUrl: parseUrl('STELLAR_RPC_URL', env.STELLAR_RPC_URL?.trim() || defaults.rpcUrl),
    escrowContractId,
    networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE?.trim() || undefined,
    allowHttp: env.STELLAR_ALLOW_HTTP ? env.STELLAR_ALLOW_HTTP === 'true' : undefined,
    timeoutMs: parsePositiveInt('STELLAR_TIMEOUT_MS', env.STELLAR_TIMEOUT_MS),
    appName: env.STELLAR_APP_NAME?.trim() || undefined,
    appVersion: env.STELLAR_APP_VERSION?.trim() || undefined,
    retries: parsePositiveInt('STELLAR_RETRIES', env.STELLAR_RETRIES),
  };
}
