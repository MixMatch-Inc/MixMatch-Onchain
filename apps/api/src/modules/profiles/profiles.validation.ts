import { z } from 'zod';
import {
  AvailabilityStatus,
  DjGenre,
  EventType,
  UserRole,
} from '@mixmatch/types';

const pricingSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0),
}).refine((value) => value.max >= value.min, {
  message: 'Maximum price must be greater than or equal to minimum price',
  path: ['max'],
});

const socialLinksSchema = z.object({
  instagram: z.string().trim().url().optional(),
  soundcloud: z.string().trim().url().optional(),
  youtube: z.string().trim().url().optional(),
  spotify: z.string().trim().url().optional(),
  website: z.string().trim().url().optional(),
}).partial();

export const createDjProfileSchema = z.object({
  stageName: z.string().trim().min(2),
  bio: z.string().trim().max(1000).optional(),
  genres: z.array(z.enum(Object.values(DjGenre) as [DjGenre, ...DjGenre[]])).default([]),
  vibeTags: z.array(z.string().trim().min(1)).default([]),
  pricing: pricingSchema,
  location: z.string().trim().min(1).optional(),
  availabilityStatus: z
    .enum(Object.values(AvailabilityStatus) as [AvailabilityStatus, ...AvailabilityStatus[]])
    .optional(),
  socialLinks: socialLinksSchema.optional(),
});

export const createPlannerProfileSchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  typicalEventTypes: z.array(
    z.enum(Object.values(EventType) as [EventType, ...EventType[]]),
  ).default([]),
  website: z.string().trim().url().optional(),
});

export const createLoverProfileSchema = z.object({
  favoriteGenres: z.array(
    z.enum(Object.values(DjGenre) as [DjGenre, ...DjGenre[]]),
  ).default([]),
  preferredVibes: z.array(z.string().trim().min(1)).default([]),
});

export const createProfileSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal(UserRole.DJ),
    profile: createDjProfileSchema,
  }),
  z.object({
    role: z.literal(UserRole.PLANNER),
    profile: createPlannerProfileSchema,
  }),
  z.object({
    role: z.literal(UserRole.MUSIC_LOVER),
    profile: createLoverProfileSchema,
  }),
]);
