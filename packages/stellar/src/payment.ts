import { Asset, BASE_FEE, Memo, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from './client.js';
import type { Wallet } from './wallet.js';
import { classifyStellarPaymentError } from './payment-errors.js';
import { InMemoryIdempotencyStore, type IdempotencyStore } from './idempotency.js';

export interface SubmitNativePaymentParams {
  /** Wallet for the paying account; must be able to sign for it. */
  sourceWallet: Wallet;
  /** Public key of the receiving account. */
  destinationPublicKey: string;
  /** Amount of native XLM to send, as a decimal string (e.g. `"10.5"`). */
  amount: string;
  /** Optional text memo attached to the transaction. */
  memo?: string;
  /**
   * Caller-supplied key used to dedupe retries/concurrent submissions of the
   * "same" payment. See `IdempotencyStore` docs for scope/limitations.
   */
  idempotencyKey?: string;
}

export interface StellarPaymentResult {
  hash: string;
  ledger: number;
  successful: boolean;
}

/**
 * Builds, signs, and submits native XLM payment transactions.
 *
 * Failures are normalized to `StellarPaymentError` (see `payment-errors.ts`)
 * so callers can branch on a stable `kind` instead of Horizon's raw error
 * shapes. Submissions sharing an `idempotencyKey` are deduped via the
 * injected `IdempotencyStore` (in-memory by default).
 */
export class StellarPaymentService {
  private readonly client: DefaultStellarClient;
  private readonly idempotencyStore: IdempotencyStore<StellarPaymentResult>;

  constructor(
    client: DefaultStellarClient,
    idempotencyStore: IdempotencyStore<StellarPaymentResult> = new InMemoryIdempotencyStore(),
  ) {
    this.client = client;
    this.idempotencyStore = idempotencyStore;
  }

  /**
   * Submits a native XLM payment. If `idempotencyKey` matches an in-flight
   * or previously-successful submission, that same result is returned
   * instead of submitting a second, duplicate transaction. A failed
   * submission is evicted from the store so a subsequent retry with the
   * same key can actually attempt again.
   */
  async submitNativePayment(params: SubmitNativePaymentParams): Promise<StellarPaymentResult> {
    const { idempotencyKey } = params;

    if (idempotencyKey) {
      const existing = this.idempotencyStore.get(idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const submission = this.buildAndSubmit(params);

    if (idempotencyKey) {
      this.idempotencyStore.set(idempotencyKey, submission);
      submission.catch(() => {
        this.idempotencyStore.delete(idempotencyKey);
      });
    }

    return submission;
  }

  private async buildAndSubmit(params: SubmitNativePaymentParams): Promise<StellarPaymentResult> {
    const { sourceWallet, destinationPublicKey, amount, memo } = params;

    let sourceAccount;
    try {
      sourceAccount = await this.client.horizon.loadAccount(sourceWallet.publicKey);
    } catch (error) {
      throw classifyStellarPaymentError(error);
    }

    const builder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.client.config.networkPassphrase,
    }).addOperation(
      Operation.payment({
        destination: destinationPublicKey,
        asset: Asset.native(),
        amount,
      }),
    );

    if (memo) {
      builder.addMemo(Memo.text(memo));
    }

    const transaction = builder.setTimeout(30).build();

    const signature = sourceWallet.sign(transaction.hash());
    transaction.addSignature(sourceWallet.publicKey, signature.toString('base64'));

    try {
      const response = await this.client.horizon.submitTransaction(transaction);
      return {
        hash: response.hash,
        ledger: response.ledger,
        successful: response.successful,
      };
    } catch (error) {
      throw classifyStellarPaymentError(error);
    }
  }
}
