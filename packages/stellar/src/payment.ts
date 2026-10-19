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

function invalid(message: string): never {
  throw new StellarPaymentError('validation', message);
}

export class StellarPaymentService {
  constructor(private readonly client: StellarClient) {}

/**
 * Builds, signs, and submits a payment — native XLM if `params.asset` is
 * omitted, otherwise the given asset. A stale sequence number (`tx_bad_seq`,
 * e.g. from concurrent payments out of one account) is retried with a freshly
 * loaded account. Failures after the transaction was built carry its `txHash`
 * and signed `envelopeXdr`, so the outcome can be looked up or resubmitted.
 */
export async function submitPayment(
  client: DefaultStellarClient,
  params: SubmitPaymentParams,
): Promise<StellarPaymentResult> {
  validatePaymentParams(params);

  for (let attempt = 1; ; attempt++) {
    let txHash: string | undefined;
    let envelopeXdr: string | undefined;
    try {
      const sourceAccount = await client.horizon.loadAccount(params.sourceWallet.publicKey);

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
      envelopeXdr = transaction.toXDR();

      const result = await client.horizon.submitTransaction(transaction);
      return { hash: result.hash, ledger: result.ledger };
    } catch (error) {
      const classified = classifyStellarPaymentError(error);
      if (classified.kind === 'sequence_conflict' && attempt < MAX_SEQUENCE_ATTEMPTS) {
        continue;
      }
      throw withTransactionContext(classified, txHash, envelopeXdr);
    }
  }
}

/** Looks up a previously submitted transaction by hash. Returns `null` if the network has no record of it. */
export async function lookupPayment(client: DefaultStellarClient, hash: string): Promise<StellarPaymentResult | null> {
  try {
    const record = await client.horizon.transactions().transaction(hash).call();
    return { hash: record.hash, ledger: record.ledger_attr };
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw classifyStellarPaymentError(error);
  }
}

/**
 * Resubmits a previously signed envelope (`StellarPaymentError.envelopeXdr`).
 * The transaction hash is unchanged, so this is safe after a timeout: if the
 * original was applied, Horizon returns that result instead of paying twice.
 */
export async function resubmitPayment(client: DefaultStellarClient, envelopeXdr: string): Promise<StellarPaymentResult> {
  const transaction = TransactionBuilder.fromXDR(envelopeXdr, client.networkPassphrase);
  try {
    const result = await client.horizon.submitTransaction(transaction);
    return { hash: result.hash, ledger: result.ledger };
  } catch (error) {
    throw withTransactionContext(
      classifyStellarPaymentError(error),
      transaction.hash().toString('hex'),
      envelopeXdr,
    );
  }
}

/** Class facade over the payment functions, kept for existing callers. See docs/decisions/stellar-module-style.md. */
export class StellarPaymentService {
  constructor(private readonly client: DefaultStellarClient) {}

  submitPayment(params: SubmitPaymentParams): Promise<StellarPaymentResult> {
    return submitPayment(this.client, params);
  }

  /** Native-XLM-only convenience wrapper around `submitPayment`. */
  submitNativePayment(params: SubmitNativePaymentParams): Promise<StellarPaymentResult> {
    return submitPayment(this.client, params);
  }

  lookupPayment(hash: string): Promise<StellarPaymentResult | null> {
    return lookupPayment(this.client, hash);
  }

  resubmitPayment(envelopeXdr: string): Promise<StellarPaymentResult> {
    return resubmitPayment(this.client, envelopeXdr);
  }
}
