import { Horizon, NotFoundError } from '@stellar/stellar-sdk';
import { KeypairWallet } from './wallet.js';
import type { StellarNetwork } from './types/index.js';

/** A freshly generated Stellar account: a wallet plus the network it belongs to. */
export interface GeneratedStellarAccount {
  network: StellarNetwork;
  publicKey: string;
  wallet: KeypairWallet;
}

/** Generates a brand-new Stellar keypair for `network`. Not yet funded on-chain. */
export function generateStellarAccount(network: StellarNetwork): GeneratedStellarAccount {
  const wallet = KeypairWallet.generate(network);
  return { network, publicKey: wallet.publicKey, wallet };
}

/** Thrown when an account doesn't exist on-chain (e.g. never funded). */
export class StellarAccountNotFoundError extends Error {
  constructor(publicKey: string) {
    super(`Stellar account not found: ${publicKey}. It may not be funded yet.`);
    this.name = 'StellarAccountNotFoundError';
  }
}

/** On-chain state for a loaded Stellar account. */
export interface LoadedStellarAccount {
  network: StellarNetwork;
  publicKey: string;
  sequence: string;
  balances: Horizon.HorizonApi.BalanceLine[];
}

/**
 * Loads an account's current on-chain state from Horizon.
 * @throws {StellarAccountNotFoundError} if the account doesn't exist (e.g. unfunded).
 */
export async function loadStellarAccount(
  horizon: Horizon.Server,
  network: StellarNetwork,
  publicKey: string,
): Promise<LoadedStellarAccount> {
  try {
    const account = await horizon.loadAccount(publicKey);
    return {
      network,
      publicKey,
      sequence: account.sequenceNumber(),
      balances: account.balances,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new StellarAccountNotFoundError(publicKey);
    }
    throw error;
  }
}
