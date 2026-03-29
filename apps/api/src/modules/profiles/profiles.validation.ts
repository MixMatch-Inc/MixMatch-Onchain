import { z } from 'zod';
import {
  AvailabilityStatus,
  DjGenre,
  EventType,
  UserRole,
} from '@mixmatch/types';
import { AvailabilityStatus, DjGenre, EventType, UserRole } from '@mixmatch/types';

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

const djProfileSchema = z.object({
  stageName: z.string().trim().min(2).optional(),
  bio: z.string().trim().max(1000).optional(),
  genres: z.array(z.enum(Object.values(DjGenre) as [DjGenre, ...DjGenre[]])).optional(),
  vibeTags: z.array(z.string().trim().min(1)).optional(),
  pricing: pricingSchema.optional(),
  location: z.string().trim().min(1).optional(),
  availabilityStatus: z
    .enum(Object.values(AvailabilityStatus) as [AvailabilityStatus, ...AvailabilityStatus[]])
    .optional(),
  socialLinks: socialLinksSchema.optional(),
});

const plannerProfileSchema = z.object({
  organizationName: z.string().trim().min(2).max(200).optional(),
  typicalEventTypes: z.array(
    z.enum(Object.values(EventType) as [EventType, ...EventType[]]),
  ).optional(),
  website: z.string().trim().url().optional(),
});

const loverProfileSchema = z.object({
  favoriteGenres: z.array(
    z.enum(Object.values(DjGenre) as [DjGenre, ...DjGenre[]]),
  ).optional(),
  preferredVibes: z.array(z.string().trim().min(1)).optional(),
});

export const updateProfileSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal(UserRole.DJ), profile: djProfileSchema }),
  z.object({ role: z.literal(UserRole.PLANNER), profile: plannerProfileSchema }),
  z.object({ role: z.literal(UserRole.MUSIC_LOVER), profile: loverProfileSchema }),
]);
