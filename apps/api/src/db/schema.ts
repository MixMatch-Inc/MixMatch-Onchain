/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  jsonb,
  real,
} from 'drizzle-orm/pg-core';
// @ts-expect-error Drizzle vector types are not perfectly aligned with this version
import { vector } from 'pgvector/drizzle-orm';

// Enums
export const providerEnum = pgEnum('provider', ['spotify', 'apple_music']);

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
