/**
 * Shared user and taste-profile type definitions (issue #1476).
 *
 * Generated from / aligned with the api-py OpenAPI schema.
 * Consumers: apps/web, apps/mobile.
 * Not yet imported by either app; this is a standalone helper ready for adoption.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum(['USER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string(),
  role: UserRoleSchema,
  created_at: z.string().datetime(),
  tos_accepted_at: z.string().datetime().nullable(),
  listening_history_consent: z.boolean(),
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1).max(64),
  password: z.string().min(8),
  listening_history_consent: z.boolean().default(false),
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

// ---------------------------------------------------------------------------
// Taste Profile
// ---------------------------------------------------------------------------

export const TasteProfileSchema = z.object({
  user_id: z.string().uuid(),
  genres: z.array(z.string()),
  energy: z.number().min(0).max(1),
  valence: z.number().min(0).max(1),
  danceability: z.number().min(0).max(1),
  is_mock: z.boolean(),
  updated_at: z.string().datetime().nullable(),
});
export type TasteProfile = z.infer<typeof TasteProfileSchema>;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const NotificationPreferenceSchema = z.object({
  user_id: z.string().uuid(),
  email_on_match: z.boolean().default(true),
  email_on_payment: z.boolean().default(true),
  email_on_escrow: z.boolean().default(true),
});
export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;
