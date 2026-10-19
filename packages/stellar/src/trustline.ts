import { Asset, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import type { StellarClient } from './interfaces/index.js';
import { classifyStellarPaymentError } from './payment-errors.js';
import { DEFAULT_TRANSACTION_TIMEOUT_SECONDS, resolveFee } from './fees.js';
import type { StellarAssetRef } from './types/index.js';
import type { StellarPaymentResult } from './payment.js';
import type { Wallet } from './wallet.js';


export interface EstablishTrustlineParams {
  client: StellarClient;
  wallet: Wallet;
  asset: StellarAssetRef;
  /** Max amount of the asset this account will hold. Omit for the protocol maximum. */
  limit?: string;
  /** Transaction validity window in seconds. Defaults to `DEFAULT_TRANSACTION_TIMEOUT_SECONDS`. */
  timeoutSeconds?: number;
}

/**
 * Establishes (or updates the limit of) a trustline from `wallet`'s account
 * to `asset`, via a `changeTrust` operation. Required before this account
 * can hold or receive a non-native asset — see `StellarPaymentErrorKind`'s
 * `destination_requires_trustline`/`source_requires_trustline` for what
 * happens when a payment is attempted without one.
 */
export async function establishTrustline(params: EstablishTrustlineParams): Promise<StellarPaymentResult> {
  try {
    const sourceAccount = await params.client.horizon.loadAccount(params.wallet.publicKey);

    const timeoutSeconds = params.timeoutSeconds ?? DEFAULT_TRANSACTION_TIMEOUT_SECONDS;
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: await resolveFee(params.client),
      networkPassphrase: params.client.networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset: toStellarAsset(params.asset),
          limit: params.limit,
        }),
      )
      .setTimeout(timeoutSeconds)
      .build();

    await params.wallet.sign(transaction);

    const result = await params.client.horizon.submitTransaction(transaction);
    return { hash: result.hash, ledger: result.ledger };
  } catch (error) {
    throw classifyStellarPaymentError(error);
  }
}
