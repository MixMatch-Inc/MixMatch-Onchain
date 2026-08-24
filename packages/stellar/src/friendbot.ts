import type { Horizon } from '@stellar/stellar-sdk';
import type { StellarNetwork } from './types/index.js';

/**
 * Funds a freshly-generated account on testnet via Friendbot. No-op (throws)
 * if called against `public` — there is no faucet on the live network.
 */
export async function fundTestnetAccount(
  horizon: Horizon.Server,
  network: StellarNetwork,
  publicKey: string,
): Promise<void> {
  if (network !== 'testnet') {
    throw new Error('fundTestnetAccount can only be used on testnet');
  }
  await horizon.friendbot(publicKey).call();
}
