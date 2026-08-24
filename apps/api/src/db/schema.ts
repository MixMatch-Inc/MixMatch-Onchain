import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  jsonb,
  real,
  vector,
} from 'drizzle-orm/pg-core';

// Enums
export const providerEnum = pgEnum('provider', ['spotify', 'apple_music']);
export const stellarNetworkEnum = pgEnum('stellar_network', [
  'testnet',
  'public',
]);
export const transactionStatusEnum = pgEnum('transaction_status', [
  'PENDING',
  'SUCCESS',
  'FAILED',
  'NEEDS_REVIEW',
]);

// Identity Models
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash'),
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
  status: transactionStatusEnum('status').default('PENDING').notNull(),
  stellarTxHash: text('stellar_tx_hash'),
  failureCode: text('failure_code'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
