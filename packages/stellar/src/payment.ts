import { BASE_FEE, Memo, NotFoundError, Operation, StrKey, TransactionBuilder } from '@stellar/stellar-sdk';
import { toStellarAsset } from './assets.js';
import type { DefaultStellarClient } from './client.js';
import { classifyStellarPaymentError, StellarPaymentError, withTransactionContext } from './payment-errors.js';
import type { StellarAssetRef } from './types/index.js';
import type { Wallet } from './wallet.js';

const TRANSACTION_TIMEOUT_SECONDS = 30;
/** Attempts made when the source account's sequence number is stale (`tx_bad_seq`), reloading it each time. */
const MAX_SEQUENCE_ATTEMPTS = 3;
const MAX_MEMO_BYTES = 28;
const AMOUNT_PATTERN = /^\d+(\.\d{1,7})?$/;
const ASSET_CODE_PATTERN = /^[a-zA-Z0-9]{1,12}$/;

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

function invalid(message: string): never {
  throw new StellarPaymentError('validation', message);
}

/** Rejects bad input before anything is built or sent, so it is never reported as a network failure. */
export function validatePaymentParams(params: SubmitPaymentParams): void {
  const { destinationPublicKey, amount, memo, asset } = params;
  if (!StrKey.isValidEd25519PublicKey(destinationPublicKey) && !StrKey.isValidMed25519PublicKey(destinationPublicKey)) {
    invalid('Destination is not a valid Stellar account address.');
  }
  if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
    invalid('Amount must be a positive number with at most 7 decimal places.');
  }
  if (memo !== undefined && Buffer.byteLength(memo, 'utf8') > MAX_MEMO_BYTES) {
    invalid(`Memo must be at most ${MAX_MEMO_BYTES} bytes.`);
  }
  if (asset) {
    if (!ASSET_CODE_PATTERN.test(asset.code)) invalid('Asset code must be 1-12 alphanumeric characters.');
    if (!StrKey.isValidEd25519PublicKey(asset.issuer)) invalid('Asset issuer is not a valid Stellar account address.');
  }
}

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

      const builder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: client.networkPassphrase,
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
      txHash = transaction.hash().toString('hex');

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
