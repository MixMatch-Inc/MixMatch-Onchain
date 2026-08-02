import { pgTable, text, timestamp, boolean, pgEnum, uuid, jsonb, real } from 'drizzle-orm/pg-core';
// @ts-ignore
import { vector } from 'pgvector/drizzle-orm';

// Enums
export const userStatusEnum = pgEnum('user_status', ['pending_verification', 'active', 'paused', 'restricted', 'suspended', 'deactivated', 'deleted']);
export const profileVisibilityEnum = pgEnum('profile_visibility', ['public', 'members', 'matches']);
export const streamingProviderEnum = pgEnum('streaming_provider', ['spotify', 'apple_music']);
export const streamingStatusEnum = pgEnum('streaming_status', ['active', 'expired', 'revoked']);

// Auth Module
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  passwordHash: text('password_hash'),
  status: userStatusEnum('status').default('pending_verification').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
});

// Profile Module
export const profiles = pgTable('profiles', {
  userId: uuid('user_id').references(() => users.id).primaryKey(),
  username: text('username').unique().notNull(),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  intents: jsonb('intents'), // Array of intents e.g. ['connect', 'collaborate']
  visibility: profileVisibilityEnum('visibility').default('public').notNull(),
  tasteSentence: text('taste_sentence'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const streamingConnections = pgTable('streaming_connections', {
  userId: uuid('user_id').references(() => users.id).notNull(),
  provider: streamingProviderEnum('provider').notNull(),
  providerUserId: text('provider_user_id').notNull(),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc').notNull(),
  scopes: text('scopes').notNull(),
  status: streamingStatusEnum('status').default('active').notNull(),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Taste Engine Module
export const tasteProfiles = pgTable('taste_profiles', {
  userId: uuid('user_id').references(() => users.id).primaryKey(),
  embedding: vector('embedding', { dimensions: 256 }),
  phaseEmbedding: vector('phase_embedding', { dimensions: 256 }),
  genreDist: jsonb('genre_dist'),
  eraHist: jsonb('era_hist'),
  diversityIdx: real('diversity_idx'),
  discoveryQuotient: real('discovery_quotient'),
  signalCount: text('signal_count'), // e.g. int but keeping types simple for scaffolding
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
