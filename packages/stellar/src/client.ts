import { Horizon, Networks, rpc } from '@stellar/stellar-sdk';
import { loadStellarConfig, type StellarConfig } from './config.js';
import type { StellarClient } from './interfaces/index.js';

const PASSPHRASE_BY_NETWORK: Record<StellarConfig['network'], string> = {
  testnet: Networks.TESTNET,
  public: Networks.PUBLIC,
  futurenet: Networks.FUTURENET,
  standalone: 'Standalone Network ; February 2017',
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 500;

/** Thrown by `verifyNetwork` when an endpoint serves a different network than the one configured. */
export class StellarNetworkMismatchError extends Error {
  constructor(
    readonly endpoint: 'horizon' | 'rpc',
    readonly expected: string,
    readonly actual: string,
  ) {
    super(`${endpoint} endpoint serves network "${actual}" but the configured network is "${expected}"`);
    this.name = 'StellarNetworkMismatchError';
  }
}

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
    this.networkPassphrase = config.networkPassphrase ?? PASSPHRASE_BY_NETWORK[config.network];
    const allowHttp = config.allowHttp ?? config.network === 'standalone';
    const timeout = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    Horizon.AxiosClient.defaults.timeout = timeout;
    this.horizon = new Horizon.Server(config.horizonUrl, {
      allowHttp,
      appName: config.appName,
      appVersion: config.appVersion,
    });
    this.soroban = new rpc.Server(config.rpcUrl, {
      allowHttp,
      timeout,
      headers: config.appName ? { 'X-App-Name': config.appName, 'X-App-Version': config.appVersion ?? '' } : undefined,
    });
  }

  getNetwork(): StellarConfig['network'] {
    return this.config.network;
  }

  /**
   * Confirms both endpoints serve the configured network by comparing their
   * passphrases to `networkPassphrase`. Unreachable endpoints are retried
   * `config.retries` times before the error is rethrown.
   */
  async verifyNetwork(): Promise<void> {
    const attempts = (this.config.retries ?? DEFAULT_RETRIES) + 1;
    const check = async <T>(fn: () => Promise<T>): Promise<T> => {
      for (let attempt = 1; ; attempt++) {
        try {
          return await fn();
        } catch (error) {
          if (attempt >= attempts) throw error;
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        }
      }
    };

    const horizonRoot = await check(() => this.horizon.root());
    if (horizonRoot.network_passphrase !== this.networkPassphrase) {
      throw new StellarNetworkMismatchError('horizon', this.networkPassphrase, horizonRoot.network_passphrase);
    }
    const rpcNetwork = await check(() => this.soroban.getNetwork());
    if (rpcNetwork.passphrase !== this.networkPassphrase) {
      throw new StellarNetworkMismatchError('rpc', this.networkPassphrase, rpcNetwork.passphrase);
    }
  }
}

/**
 * Builds a `DefaultStellarClient` from environment variables (or an
 * explicitly-provided `StellarConfig`, e.g. for tests).
 */
export function createStellarClient(config: StellarConfig = loadStellarConfig()): DefaultStellarClient {
  return new DefaultStellarClient(config);
}

/** Like `createStellarClient`, but fails fast if the endpoints do not match the configured network. */
export async function createVerifiedStellarClient(
  config: StellarConfig = loadStellarConfig(),
): Promise<DefaultStellarClient> {
  const client = createStellarClient(config);
  await client.verifyNetwork();
  return client;
}
