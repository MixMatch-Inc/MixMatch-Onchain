import { z } from 'zod';
import { JourneyStatus } from '@mixmatch/types';

export const createJourneySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  slots: z.array(z.object({
    order: z.number().int().min(0),
    trackId: z.string().min(1),
    caption: z.string().max(500).optional(),
  })).optional(),
});

export const updateJourneySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  slots: z.array(z.object({
    order: z.number().int().min(0),
    trackId: z.string().min(1),
    caption: z.string().max(500).optional(),
  })).optional(),
});

export const listJourneysQuerySchema = z.object({
  status: z.enum(Object.values(JourneyStatus) as [JourneyStatus, ...JourneyStatus[]]).optional(),
});

export const listPublishedJourneysQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});