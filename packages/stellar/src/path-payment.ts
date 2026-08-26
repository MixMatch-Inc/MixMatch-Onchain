import { Asset, BASE_FEE, Memo, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from './client.js';
import { classifyStellarPaymentError } from './payment-errors.js';
import type { StellarPaymentResult } from './payment.js';
import type { StellarAssetRef } from './types/index.js';
import type { Wallet } from './wallet.js';

const TRANSACTION_TIMEOUT_SECONDS = 30;
/** Default slippage tolerance applied when a caller doesn't specify one: 0.5%. */
const DEFAULT_SLIPPAGE_BPS = 50;
const BPS_DENOMINATOR = 10_000;
/** Stellar amounts are fixed to 7 decimal places. */
const AMOUNT_DECIMALS = 7;

export type PathPaymentMode = 'strictSend' | 'strictReceive';

function toStellarAsset(asset?: StellarAssetRef): Asset {
  return asset ? new Asset(asset.code, asset.issuer) : Asset.native();
}

function pathHopToAssetRef(hop: { asset_type: string; asset_code: string; asset_issuer: string }): StellarAssetRef | undefined {
  return hop.asset_type === 'native' ? undefined : { code: hop.asset_code, issuer: hop.asset_issuer };
}

/** Reduces an amount by `bps` basis points, floored to Stellar's 7-decimal precision — used to derive `destMin` from a quote. */
function reduceByBps(amount: string, bps: number): string {
  return (Number(amount) * (1 - bps / BPS_DENOMINATOR)).toFixed(AMOUNT_DECIMALS);
}

/** Increases an amount by `bps` basis points, ceiled to Stellar's 7-decimal precision — used to derive `sendMax` from a quote. */
function increaseByBps(amount: string, bps: number): string {
  const scaled = Number(amount) * (1 + bps / BPS_DENOMINATOR);
  // Round up so a floating-point-induced shortfall never makes sendMax too tight to submit.
  return (Math.ceil(scaled * 10 ** AMOUNT_DECIMALS) / 10 ** AMOUNT_DECIMALS).toFixed(AMOUNT_DECIMALS);
}

export interface PathQuote {
  mode: PathPaymentMode;
  /** Omitted means native XLM. */
  sourceAsset?: StellarAssetRef;
  /** Omitted means native XLM. */
  destAsset?: StellarAssetRef;
  /** Exact amount sent, known up front for `strictSend` and computed by Horizon for `strictReceive`. */
  sourceAmount: string;
  /** Exact amount received, known up front for `strictReceive` and computed by Horizon for `strictSend`. */
  destAmount: string;
  /** Intermediate assets the payment routes through, in order (excludes source/dest). */
  path: (StellarAssetRef | undefined)[];
}

export interface FindPathParams {
  client: DefaultStellarClient;
  /** Omit for native XLM. */
  sourceAsset?: StellarAssetRef;
  /** Omit for native XLM. */
  destAsset?: StellarAssetRef;
  /** Exact amount to send (strictSend) or exact amount the recipient should receive (strictReceive). */
  amount: string;
}

/**
 * Finds the best strict-send path — send exactly `amount` of `sourceAsset`,
 * see the most `destAsset` the recipient could receive. Returns `null` if no
 * path exists (Horizon returns an empty page rather than an error in that case).
 */
export async function findStrictSendPath(params: FindPathParams): Promise<PathQuote | null> {
  try {
    const page = await params.client.horizon
      .strictSendPaths(toStellarAsset(params.sourceAsset), params.amount, [toStellarAsset(params.destAsset)])
      .call();

    const best = page.records.reduce<(typeof page.records)[number] | null>((max, record) => {
      if (!max || Number(record.destination_amount) > Number(max.destination_amount)) {
        return record;
      }
      return max;
    }, null);

    if (!best) {
      return null;
    }

    return {
      mode: 'strictSend',
      sourceAsset: params.sourceAsset,
      destAsset: params.destAsset,
      sourceAmount: params.amount,
      destAmount: best.destination_amount,
      path: best.path.map(pathHopToAssetRef),
    };
  } catch (error) {
    throw classifyStellarPaymentError(error);
  }
}

/**
 * Finds the best strict-receive path — have the recipient receive exactly
 * `amount` of `destAsset`, see the least `sourceAsset` the sender would need
 * to send. Returns `null` if no path exists.
 */
export async function findStrictReceivePath(params: FindPathParams): Promise<PathQuote | null> {
  try {
    const page = await params.client.horizon
      .strictReceivePaths([toStellarAsset(params.sourceAsset)], toStellarAsset(params.destAsset), params.amount)
      .call();

    const best = page.records.reduce<(typeof page.records)[number] | null>((min, record) => {
      if (!min || Number(record.source_amount) < Number(min.source_amount)) {
        return record;
      }
      return min;
    }, null);

    if (!best) {
      return null;
    }

    return {
      mode: 'strictReceive',
      sourceAsset: params.sourceAsset,
      destAsset: params.destAsset,
      sourceAmount: best.source_amount,
      destAmount: params.amount,
      path: best.path.map(pathHopToAssetRef),
    };
  } catch (error) {
    throw classifyStellarPaymentError(error);
  }
}

export interface SubmitPathPaymentParams {
  client: DefaultStellarClient;
  sourceWallet: Wallet;
  destinationPublicKey: string;
  memo?: string;
  /** A quote from `findStrictSendPath`/`findStrictReceivePath` — its `mode` decides which operation is built. */
  quote: PathQuote;
  /**
   * Slippage tolerance in basis points, applied to the quote to derive
   * `destMin` (strictSend) or `sendMax` (strictReceive) — protects against
   * the market moving between quoting and submission. Defaults to 50 (0.5%).
   */
  slippageBps?: number;
}

/** Builds, signs, and submits the path-payment operation for a previously-fetched quote. */
export async function submitPathPayment(params: SubmitPathPaymentParams): Promise<StellarPaymentResult> {
  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const path = params.quote.path.map(toStellarAsset);
  const sendAsset = toStellarAsset(params.quote.sourceAsset);
  const destAsset = toStellarAsset(params.quote.destAsset);

  try {
    const sourceAccount = await params.client.horizon.loadAccount(params.sourceWallet.publicKey);

    const operation =
      params.quote.mode === 'strictSend'
        ? Operation.pathPaymentStrictSend({
            sendAsset,
            sendAmount: params.quote.sourceAmount,
            destination: params.destinationPublicKey,
            destAsset,
            destMin: reduceByBps(params.quote.destAmount, slippageBps),
            path,
          })
        : Operation.pathPaymentStrictReceive({
            sendAsset,
            sendMax: increaseByBps(params.quote.sourceAmount, slippageBps),
            destination: params.destinationPublicKey,
            destAsset,
            destAmount: params.quote.destAmount,
            path,
          });

    const builder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: params.client.networkPassphrase,
    }).addOperation(operation);

    if (params.memo) {
      builder.addMemo(Memo.text(params.memo));
    }

    const transaction = builder.setTimeout(TRANSACTION_TIMEOUT_SECONDS).build();
    await params.sourceWallet.sign(transaction);

    const result = await params.client.horizon.submitTransaction(transaction);
    return { hash: result.hash, ledger: result.ledger };
  } catch (error) {
    throw classifyStellarPaymentError(error);
  }
}
