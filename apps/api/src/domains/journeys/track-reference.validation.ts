import { z } from 'zod';
import { ProviderType } from '@mixmatch/types';

export const createTrackReferenceSchema = z.object({
  provider: z.nativeEnum(ProviderType),
  providerTrackId: z.string().min(1),
  title: z.string().min(1).max(200),
  artists: z.array(z.object({
    name: z.string().min(1),
    providerId: z.string().optional(),
  })).min(1),
  album: z.object({
    name: z.string().min(1),
    providerId: z.string().optional(),
    releaseDate: z.string().datetime().optional(),
  }).optional(),
  durationMs: z.number().int().min(0),
  previewUrl: z.string().url().optional(),
  artwork: z.array(z.object({
    url: z.string().url(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })),
  explicit: z.boolean(),
  audioFeaturesCacheKey: z.string().optional(),
  rawPayload: z.record(z.any()),
});

export const searchTrackReferencesQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const getRecentTrackReferencesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});