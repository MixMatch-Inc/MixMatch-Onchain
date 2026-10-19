import { Asset, Memo, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import type { StellarClient } from './interfaces/index.js';
import { classifyStellarPaymentError } from './payment-errors.js';
import { DEFAULT_TRANSACTION_TIMEOUT_SECONDS, resolveFee } from './fees.js';
import type { StellarAssetRef } from './types/index.js';
import type { Wallet } from './wallet.js';


export interface SubmitPaymentParams {
  sourceWallet: Wallet;
  destinationPublicKey: string;
  amount: string;
  memo?: string;
  /** Omit for native XLM; pass a code+issuer to send a custom asset. */
  asset?: StellarAssetRef;
  /** Transaction validity window in seconds. Defaults to `DEFAULT_TRANSACTION_TIMEOUT_SECONDS`. */
  timeoutSeconds?: number;
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
  constructor(private readonly client: StellarClient) {}

  /** Builds, signs, and submits a payment — native XLM if `params.asset` is omitted, otherwise the given asset. */
  async submitPayment(params: SubmitPaymentParams): Promise<StellarPaymentResult> {
    try {
      const sourceAccount = await this.client.horizon.loadAccount(params.sourceWallet.publicKey);

      const timeoutSeconds = params.timeoutSeconds ?? DEFAULT_TRANSACTION_TIMEOUT_SECONDS;
      const builder = new TransactionBuilder(sourceAccount, {
        fee: await resolveFee(this.client),
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

      const transaction = builder.setTimeout(timeoutSeconds).build();

      await params.sourceWallet.sign(transaction);

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
