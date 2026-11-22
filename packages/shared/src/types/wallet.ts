import type { TransactionRecord } from './payments.js';

/** A recipient saved by the user, with the memo that should be applied by default. */
export interface SavedContact {
  id: string;
  label: string;
  destinationPublicKey: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedContactInput {
  label: string;
  destinationPublicKey: string;
  memo?: string | null;
}

export interface SavedContactsResponse {
  contacts: SavedContact[];
}

/** Result of resolving a `name*mixmatch.app` federation address or an `@handle`. */
export interface HandleLookupResponse {
  handle: string;
  displayName: string;
  publicKey: string;
  avatarUrl?: string | null;
}

/** An asset the user can select in Send, with its trustline state. */
export interface StellarAsset {
  code: string;
  /** `null` for native XLM. */
  issuer: string | null;
  name?: string;
  trustlineEstablished: boolean;
}

export interface AssetListResponse {
  assets: StellarAsset[];
}

export interface TransactionTimelineEntry {
  status: string;
  label: string;
  at: string | null;
  description: string;
}

export interface TransactionDetailResponse {
  transaction: TransactionRecord;
  timeline: TransactionTimelineEntry[];
  explorerUrl: string | null;
}

/** Network-aware Stellar Expert transaction URL, or `null` when there is no hash yet. */
export function explorerTransactionUrl(
  hash: string | null | undefined,
  network: 'testnet' | 'public' | string = 'testnet',
): string | null {
  if (!hash) return null;
  const host = network === 'public' ? 'stellar.expert' : 'stellar.expert';
  const path = network === 'public' ? 'explorer/tx' : 'explorer/testnet/tx';
  return `https://${host}/${path}/${encodeURIComponent(hash)}`;
}
