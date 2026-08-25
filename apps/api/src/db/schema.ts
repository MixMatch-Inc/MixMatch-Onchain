import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  jsonb,
  real,
  vector,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';

// Enums
export const providerEnum = pgEnum('provider', ['spotify', 'apple_music']);
export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN']);
export const stellarNetworkEnum = pgEnum('stellar_network', [
  'testnet',
  'public',
]);
export const transactionStatusEnum = pgEnum('transaction_status', [
  'PENDING',
  // Above the high-value threshold: the caller's own signature is on file
  // but an admin co-signature is still required before submission. See
  // modules/payments/multisig — apps/api/src/modules/payments/payments.service.ts.
  'PENDING_SIGNATURE',
  'SUCCESS',
  'FAILED',
  'NEEDS_REVIEW',
]);
export const escrowStatusEnum = pgEnum('escrow_status', [
  'PENDING',
  'LOCKED',
  'RELEASED',
  'REFUNDED',
  'FAILED',
]);
export const anchorTransactionKindEnum = pgEnum('anchor_transaction_kind', [
  'deposit',
  'withdrawal',
]);
// Mirrors SEP-24's `status` field verbatim (see
// @mixmatch/stellar's Sep24TransactionStatus) — not our own vocabulary,
// so it round-trips exactly what the anchor reports.
export const anchorTransactionStatusEnum = pgEnum('anchor_transaction_status', [
  'incomplete',
  'pending_user_transfer_start',
  'pending_user_transfer_complete',
  'pending_external',
  'pending_anchor',
  'pending_stellar',
  'pending_trust',
  'pending_user',
  'on_hold',
  'completed',
  'refunded',
  'expired',
  'error',
]);

// Identity Models
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash'),
  role: userRoleEnum('role').default('USER').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const streamingConnections = pgTable('streaming_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  provider: providerEnum('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Taste Engine Models
export const tasteProfiles = pgTable('taste_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  topArtists: jsonb('top_artists').$type<string[]>(),
  topGenres: jsonb('top_genres').$type<string[]>(),
  acousticness: real('acousticness'),
  danceability: real('danceability'),
  energy: real('energy'),
  valence: real('valence'),
  // 1536-dimensional vector for Spotify embedding similarity matching
  embedding: vector('embedding', { dimensions: 1536 }),
  lastIngestedAt: timestamp('last_ingested_at').defaultNow().notNull(),
});

// Stellar Payments Models
export const stellarAccounts = pgTable('stellar_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  publicKey: text('public_key').unique().notNull(),
  // AES-256-GCM ciphertext of the account's Stellar secret key, see
  // modules/payments/wallet-encryption.ts. Never stored in plaintext.
  encryptedSecretKey: text('encrypted_secret_key').notNull(),
  network: stellarNetworkEnum('network').default('testnet').notNull(),
  // True once the account has had the platform's admin key added as a
  // co-signer and thresholds configured (see multisig.ts's
  // configureMultisig) — done lazily on the account's first high-value
  // payment, not at account creation.
  multisigConfigured: boolean('multisig_configured').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Client-supplied (or server-generated, if omitted) key used to dedupe
  // repeated payment requests at the database layer.
  idempotencyKey: text('idempotency_key').unique().notNull(),
  stellarAccountId: uuid('stellar_account_id')
    .references(() => stellarAccounts.id, { onDelete: 'cascade' })
    .notNull(),
  destinationPublicKey: text('destination_public_key').notNull(),
  amount: text('amount').notNull(),
  memo: text('memo'),
  // Null means native XLM. When set, assetIssuer is always set too (and
  // vice versa) — enforced at the application layer, see
  // @mixmatch/shared's sendPaymentSchema.
  assetCode: text('asset_code'),
  assetIssuer: text('asset_issuer'),
  // Set only for path payments, where the recipient receives a different
  // asset than assetCode/assetIssuer. Null means "same asset as sent"
  // (a plain payment). destAmount is the exact amount the recipient
  // receives — known up front for strictReceive, resolved from the quote
  // at submission time for strictSend — used to match reconciliation
  // against the recipient-side Horizon record, which reports the
  // *destination* asset/amount for path payment operations.
  receiveAssetCode: text('receive_asset_code'),
  receiveAssetIssuer: text('receive_asset_issuer'),
  destAmount: text('dest_amount'),
  // Set only while status is PENDING_SIGNATURE: the payment transaction,
  // signed by the account's own key, awaiting an admin co-signature
  // before it can be submitted. Cleared once resolved (approved or
  // rejected) either way — never kept around once acted on.
  pendingEnvelopeXdr: text('pending_envelope_xdr'),
  status: transactionStatusEnum('status').default('PENDING').notNull(),
  stellarTxHash: text('stellar_tx_hash'),
  failureCode: text('failure_code'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// SEP-24 anchor deposit/withdraw: a separate table rather than reusing
// `transactions` — a SEP-24 transfer isn't a Stellar payment we build and
// submit ourselves (there's no `destinationPublicKey`/`sendPayment`-style
// flow), it's a multi-minute-to-multi-hour external process on an
// anchor's own systems that we poll the status of. See
// modules/payments/anchor.service.ts.
export const anchorTransactions = pgTable('anchor_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  stellarAccountId: uuid('stellar_account_id')
    .references(() => stellarAccounts.id, { onDelete: 'cascade' })
    .notNull(),
  kind: anchorTransactionKindEnum('kind').notNull(),
  assetCode: text('asset_code').notNull(),
  homeDomain: text('home_domain').notNull(),
  // The anchor's own id for this transfer — what GET /transaction is
  // polled with. Unique per anchor; scoped globally here since this
  // codebase only integrates one anchor at a time (see ANCHOR_HOME_DOMAIN).
  sep24TransactionId: text('sep24_transaction_id').unique().notNull(),
  status: anchorTransactionStatusEnum('status').notNull(),
  interactiveUrl: text('interactive_url'),
  moreInfoUrl: text('more_info_url'),
  amountIn: text('amount_in'),
  amountOut: text('amount_out'),
  stellarTransactionId: text('stellar_transaction_id'),
  externalTransactionId: text('external_transaction_id'),
  message: text('message'),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Soroban escrow: see contracts/escrow. Unlike `transactions`, the durable
// idempotency row here is created *before* `deposit` is submitted, but the
// on-chain escrow id is only known *after* it lands — so `onChainEscrowId`
// starts null and is filled in once the deposit transaction succeeds.
export const escrows = pgTable('escrows', {
  id: uuid('id').defaultRandom().primaryKey(),
  idempotencyKey: text('idempotency_key').unique().notNull(),
  payerStellarAccountId: uuid('payer_stellar_account_id')
    .references(() => stellarAccounts.id, { onDelete: 'cascade' })
    .notNull(),
  payeePublicKey: text('payee_public_key').notNull(),
  tokenContractId: text('token_contract_id').notNull(),
  amount: text('amount').notNull(),
  // The contract's u64 escrow id (stored as text — Postgres has no
  // unsigned 64-bit type), null until the deposit transaction lands.
  onChainEscrowId: text('on_chain_escrow_id'),
  timeoutLedger: integer('timeout_ledger'),
  status: escrowStatusEnum('status').default('PENDING').notNull(),
  depositTxHash: text('deposit_tx_hash'),
  finalizeTxHash: text('finalize_tx_hash'),
  failureCode: text('failure_code'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
