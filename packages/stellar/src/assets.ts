import { Asset } from '@stellar/stellar-sdk';
import type { StellarAssetRef } from './types/index.js';

/** Converts an optional `StellarAssetRef` to an SDK `Asset`; omitted means native XLM. */
export function toStellarAsset(asset?: StellarAssetRef): Asset {
  return asset ? new Asset(asset.code, asset.issuer) : Asset.native();
}
