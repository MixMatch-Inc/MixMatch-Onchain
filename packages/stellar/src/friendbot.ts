import type { Horizon } from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types/index.js';

/** Thrown when Friendbot funding fails or is requested on a network that doesn't support it. */
export class FriendbotFundingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FriendbotFundingError';
  }
}

/**
 * Funds a testnet account via Friendbot (Horizon's `/friendbot` endpoint).
 * Only available on `testnet` — Friendbot doesn't exist on the public network.
 */
export async function fundTestnetAccount(
  horizon: Horizon.Server,
  network: StellarNetwork,
  publicKey: string,
): Promise<void> {
  if (network !== 'testnet') {
    throw new FriendbotFundingError('Friendbot funding is only available on the testnet network.');
  }

  try {
    await horizon.friendbot(publicKey).call();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FriendbotFundingError(`Friendbot funding failed for ${publicKey}: ${message}`);
  }
}
