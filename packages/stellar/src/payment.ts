import { Asset, BASE_FEE, Memo, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from './client.js';
import { classifyStellarPaymentError } from './payment-errors.js';
import type { Wallet } from './wallet.js';

const TRANSACTION_TIMEOUT_SECONDS = 30;

export interface SubmitNativePaymentParams {
  sourceWallet: Wallet;
  destinationPublicKey: string;
  amount: string;
  memo?: string;
}

export interface StellarPaymentResult {
  hash: string;
  ledger: number;
}

export class StellarPaymentService {
  constructor(private readonly client: DefaultStellarClient) {}

  /** Builds, signs, and submits a native-XLM payment. Throws a `StellarPaymentError` on failure. */
  async submitNativePayment(params: SubmitNativePaymentParams): Promise<StellarPaymentResult> {
    try {
      const sourceAccount = await this.client.horizon.loadAccount(params.sourceWallet.publicKey);

      const builder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.client.networkPassphrase,
      }).addOperation(
        Operation.payment({
          destination: params.destinationPublicKey,
          asset: Asset.native(),
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
}
