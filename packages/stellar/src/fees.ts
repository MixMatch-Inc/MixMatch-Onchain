import { BASE_FEE, FeeBumpTransaction, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import type { StellarClient } from './interfaces/index.js';

/** Default validity window (seconds) for every transaction built by this package. Override per call with `timeoutSeconds`. */
export const DEFAULT_TRANSACTION_TIMEOUT_SECONDS = 30;

/** Percentile of recent `max_fee` values used when the network is surging. */
export type FeePercentile = 'p50' | 'p70' | 'p90' | 'p99';

/**
 * The single source of per-operation fees. Returns the network's recent
 * `max_fee` at `percentile` (never below the protocol `BASE_FEE`), so
 * transactions keep landing during a fee surge. Falls back to `BASE_FEE` when
 * fee stats are unavailable.
 */
export async function resolveFee(client: StellarClient, percentile: FeePercentile = 'p70'): Promise<string> {
  try {
    const stats = await client.horizon.feeStats();
    const surge = Number(stats.max_fee[percentile]);
    return String(Math.max(Number(BASE_FEE), Number.isFinite(surge) ? surge : 0));
  } catch {
    return BASE_FEE;
  }
}

/**
 * Wraps an inner transaction in a fee-bump transaction paid by
 * `feeSourcePublicKey`. The caller signs the returned transaction with the
 * fee source's key before submitting it.
 */
export async function buildFeeBump(
  client: StellarClient,
  innerTransaction: Transaction,
  feeSourcePublicKey: string,
): Promise<FeeBumpTransaction> {
  const baseFee = await resolveFee(client);
  return TransactionBuilder.buildFeeBumpTransaction(
    feeSourcePublicKey,
    baseFee,
    innerTransaction,
    client.networkPassphrase,
  );
}
