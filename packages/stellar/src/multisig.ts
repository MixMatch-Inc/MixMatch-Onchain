import { Asset, BASE_FEE, Memo, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import type { DefaultStellarClient } from './client.js';
import { classifyStellarPaymentError } from './payment-errors.js';
import type { StellarPaymentResult } from './payment.js';
import type { StellarAssetRef } from './types/index.js';
import type { Wallet } from './wallet.js';

const TRANSACTION_TIMEOUT_SECONDS = 30;

/**
 * Weight assigned to both the account's own key and the admin co-signer.
 * Regular operations (medium threshold, weight 1) still succeed with just
 * the account's own signature. A transaction that also carries a
 * high-threshold operation (weight 2) needs both signatures combined.
 */
const SIGNER_WEIGHT = 1;
const LOW_THRESHOLD = 1;
const MED_THRESHOLD = 1;
const HIGH_THRESHOLD = 2;

export interface ConfigureMultisigParams {
  client: DefaultStellarClient;
  /** The account being upgraded to require a co-signature for high-value payments. */
  wallet: Wallet;
  /** The platform's admin co-signing key's public key. */
  adminPublicKey: string;
}

/**
 * One-time, per-account setup: adds the platform's admin key as an
 * additional signer and sets thresholds so that regular payments (medium
 * threshold) still only need the account's own signature, but a
 * transaction carrying a high-threshold operation needs both signatures
 * combined. See `buildHighValuePaymentEnvelope` for how that's forced for
 * a specific payment.
 */
export async function configureMultisig(params: ConfigureMultisigParams): Promise<StellarPaymentResult> {
  try {
    const sourceAccount = await params.client.horizon.loadAccount(params.wallet.publicKey);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: params.client.networkPassphrase,
    })
      .addOperation(
        Operation.setOptions({
          signer: { ed25519PublicKey: params.adminPublicKey, weight: SIGNER_WEIGHT },
          masterWeight: SIGNER_WEIGHT,
          lowThreshold: LOW_THRESHOLD,
          medThreshold: MED_THRESHOLD,
          highThreshold: HIGH_THRESHOLD,
        }),
      )
      .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
      .build();

    await params.wallet.sign(transaction);

    const result = await params.client.horizon.submitTransaction(transaction);
    return { hash: result.hash, ledger: result.ledger };
  } catch (error) {
    throw classifyStellarPaymentError(error);
  }
}

export interface BuildHighValuePaymentEnvelopeParams {
  client: DefaultStellarClient;
  sourceWallet: Wallet;
  destinationPublicKey: string;
  amount: string;
  asset?: StellarAssetRef;
  memo?: string;
}

/**
 * Builds a payment transaction that requires the account's *high*
 * threshold to authorize, by including a `setOptions` operation alongside
 * the payment that re-asserts the account's current `masterWeight`.
 * `setOptions` only requires high threshold when it touches a
 * signer/weight/threshold field — an empty `setOptions{}` is classified
 * as medium and does *not* force it (verified against testnet: a
 * single-signature submission succeeded when the accompanying operation
 * had no fields set). Re-asserting the unchanged `masterWeight` is a
 * genuine no-op for account state, but the field being *present* is what
 * triggers the high-threshold check — so a transaction containing it
 * needs the combined weight of both signers (see `configureMultisig`).
 * Signs with the account's own key only and returns the
 * (partially-signed) envelope XDR — the caller persists this and submits
 * only once an admin has co-signed it via `coSignAndSubmitEnvelope`.
 */
export async function buildHighValuePaymentEnvelope(
  params: BuildHighValuePaymentEnvelopeParams,
): Promise<{ envelopeXdr: string }> {
  try {
    const sourceAccount = await params.client.horizon.loadAccount(params.sourceWallet.publicKey);

    const builder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: params.client.networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: params.destinationPublicKey,
          asset: params.asset ? new Asset(params.asset.code, params.asset.issuer) : Asset.native(),
          amount: params.amount,
        }),
      )
      // No-op: forces this transaction to require the high threshold.
      // Re-asserts the unchanged masterWeight set by configureMultisig —
      // see the doc comment above for why this (and not an empty
      // setOptions{}) is what forces the high-threshold requirement.
      .addOperation(Operation.setOptions({ masterWeight: SIGNER_WEIGHT }));

    if (params.memo) {
      builder.addMemo(Memo.text(params.memo));
    }

    const transaction = builder.setTimeout(TRANSACTION_TIMEOUT_SECONDS).build();
    await params.sourceWallet.sign(transaction);

    return { envelopeXdr: transaction.toXDR() };
  } catch (error) {
    throw classifyStellarPaymentError(error);
  }
}

export interface CoSignAndSubmitEnvelopeParams {
  client: DefaultStellarClient;
  envelopeXdr: string;
  /** The platform's admin co-signing wallet. */
  adminWallet: Wallet;
}

/** Adds the admin's signature to a previously-built high-value payment envelope and submits it. */
export async function coSignAndSubmitEnvelope(
  params: CoSignAndSubmitEnvelopeParams,
): Promise<StellarPaymentResult> {
  try {
    const transaction = new Transaction(params.envelopeXdr, params.client.networkPassphrase);
    await params.adminWallet.sign(transaction);

    const result = await params.client.horizon.submitTransaction(transaction);
    return { hash: result.hash, ledger: result.ledger };
  } catch (error) {
    throw classifyStellarPaymentError(error);
  }
}
