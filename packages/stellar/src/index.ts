// Public API of @mixmatch/stellar. Everything exported here is a supported entry
// point; modules not listed are internal. The surface is listed in README.md.

// Types & interfaces
export type { StellarNetwork, StellarAccountRef, StellarAssetRef } from './types/index.js';
export type { StellarClient } from './interfaces/index.js';

// Configuration & client
export { loadStellarConfig } from './config.js';
export type { StellarConfig } from './config.js';
export { DefaultStellarClient, createStellarClient } from './client.js';

// Fees & timeouts
export { DEFAULT_TRANSACTION_TIMEOUT_SECONDS, resolveFee, buildFeeBump } from './fees.js';
export type { FeePercentile } from './fees.js';

// Wallets & accounts
export { KeypairWallet, VaultWallet } from './wallet.js';
export type { Wallet, RemoteSigner } from './wallet.js';
export { generateStellarAccount } from './account.js';
export type { GeneratedStellarAccount } from './account.js';
export { fundTestnetAccount } from './friendbot.js';

// Payments
export { StellarPaymentError, classifyStellarPaymentError } from './payment-errors.js';
export type { StellarPaymentErrorKind } from './payment-errors.js';
export { StellarPaymentService } from './payment.js';
export type { SubmitPaymentParams, SubmitNativePaymentParams, StellarPaymentResult } from './payment.js';
export { establishTrustline } from './trustline.js';
export type { EstablishTrustlineParams } from './trustline.js';
export { findStrictSendPath, findStrictReceivePath, submitPathPayment } from './path-payment.js';
export type { PathPaymentMode, PathQuote, FindPathParams, SubmitPathPaymentParams } from './path-payment.js';
export { configureMultisig, buildHighValuePaymentEnvelope, coSignAndSubmitEnvelope } from './multisig.js';
export type {
  ConfigureMultisigParams,
  BuildHighValuePaymentEnvelopeParams,
  CoSignAndSubmitEnvelopeParams,
} from './multisig.js';
export { streamAccountPayments } from './streaming.js';
export type { PaymentStreamEvent, StreamAccountPaymentsParams, PaymentStreamHandle } from './streaming.js';

// Escrow
export { SorobanInvocationError, depositToEscrow, releaseEscrow, refundEscrow, getEscrow } from './escrow.js';
export type {
  EscrowStatus,
  EscrowRecord,
  DepositEscrowParams,
  EscrowActionParams,
  ReleaseEscrowParams,
  RefundEscrowParams,
  DepositEscrowResult,
} from './escrow.js';

// SEP helpers. Prefer the `@mixmatch/stellar/sep` subpath for new code.
export * from './sep/index.js';
