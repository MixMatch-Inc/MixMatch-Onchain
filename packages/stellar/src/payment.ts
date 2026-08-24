import { Asset, BASE_FEE, Memo, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from './client.js';
import { classifyStellarPaymentError } from './payment-errors.js';
import type { StellarAssetRef } from './types/index.js';
import type { Wallet } from './wallet.js';

const TRANSACTION_TIMEOUT_SECONDS = 30;

export interface SubmitPaymentParams {
  sourceWallet: Wallet;
  destinationPublicKey: string;
  amount: string;
  memo?: string;
  /** Omit for native XLM; pass a code+issuer to send a custom asset. */
  asset?: StellarAssetRef;
}

/** @deprecated Use `SubmitPaymentParams` (with `asset` omitted for native XLM). Kept as an alias for existing callers. */
export type SubmitNativePaymentParams = Omit<SubmitPaymentParams, 'asset'>;

export interface StellarPaymentResult {
  hash: string;
  ledger: number;
}

function toStellarAsset(asset?: StellarAssetRef): Asset {
  return asset ? new Asset(asset.code, asset.issuer) : Asset.native();
}

export class StellarPaymentService {
  constructor(private readonly client: DefaultStellarClient) {}

  /** Builds, signs, and submits a payment — native XLM if `params.asset` is omitted, otherwise the given asset. */
  async submitPayment(params: SubmitPaymentParams): Promise<StellarPaymentResult> {
    try {
      const sourceAccount = await this.client.horizon.loadAccount(params.sourceWallet.publicKey);

      const builder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.client.networkPassphrase,
      }).addOperation(
        Operation.payment({
          destination: params.destinationPublicKey,
          asset: toStellarAsset(params.asset),
          amount: params.amount,
        }),
      );

      if (params.memo) {
        builder.addMemo(Memo.text(params.memo));
      }

      const transaction = builder.setTimeout(TRANSACTION_TIMEOUT_SECONDS).build();

      transaction.sign(params.sourceWallet.getKeypair());

      const result = await this.client.horizon.submitTransaction(transaction);
      return { hash: result.hash, ledger: result.ledger };
    } catch (error) {
      throw classifyStellarPaymentError(error);
    }
  }

  /** Native-XLM-only convenience wrapper around `submitPayment`. */
  async submitNativePayment(params: SubmitNativePaymentParams): Promise<StellarPaymentResult> {
    return this.submitPayment(params);
  }
}
