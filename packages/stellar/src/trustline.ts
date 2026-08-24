import { Asset, BASE_FEE, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from './client.js';
import { classifyStellarPaymentError } from './payment-errors.js';
import type { StellarAssetRef } from './types/index.js';
import type { StellarPaymentResult } from './payment.js';
import type { Wallet } from './wallet.js';

const TRANSACTION_TIMEOUT_SECONDS = 30;

export interface EstablishTrustlineParams {
  client: DefaultStellarClient;
  wallet: Wallet;
  asset: StellarAssetRef;
  /** Max amount of the asset this account will hold. Omit for the protocol maximum. */
  limit?: string;
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

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: params.client.networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset(params.asset.code, params.asset.issuer),
          limit: params.limit,
        }),
      )
      .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
      .build();

    transaction.sign(params.wallet.getKeypair());

    const result = await params.client.horizon.submitTransaction(transaction);
    return { hash: result.hash, ledger: result.ledger };
  } catch (error) {
    throw classifyStellarPaymentError(error);
  }
}
