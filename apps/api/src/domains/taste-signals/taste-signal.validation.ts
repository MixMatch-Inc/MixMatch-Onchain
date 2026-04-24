import { z } from 'zod';
import { TasteSignalCategory } from './taste-signal.model';

const baseSignalSchema = z.object({
  label: z.string().trim().min(1).max(200),
  order: z.number().int().min(0).optional(),
});

export const createTasteSignalSchema = z.discriminatedUnion('category', [
  baseSignalSchema.extend({
    category: z.literal(TasteSignalCategory.ALBUM),
    providerRef: z.string().trim().min(1, 'providerRef is required for ALBUM'),
    narrative: z.string().trim().max(2000).optional(),
  }),
  baseSignalSchema.extend({
    category: z.literal(TasteSignalCategory.CONCERT_MEMORY),
    providerRef: z.string().trim().optional(),
    narrative: z.string().trim().max(2000).optional(),
  }),
  baseSignalSchema.extend({
    category: z.literal(TasteSignalCategory.ARTIST),
    providerRef: z.string().trim().optional(),
    narrative: z.string().trim().max(2000).optional(),
  }),
  baseSignalSchema.extend({
    category: z.literal(TasteSignalCategory.GENRE),
    providerRef: z.string().trim().optional(),
    narrative: z.string().trim().max(2000).optional(),
  }),
  baseSignalSchema.extend({
    category: z.literal(TasteSignalCategory.VIBE),
    providerRef: z.string().trim().optional(),
    narrative: z.string().trim().max(2000).optional(),
  }),
]);

export const updateTasteSignalSchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  providerRef: z.string().trim().optional(),
  narrative: z.string().trim().max(2000).optional(),
  order: z.number().int().min(0).optional(),
});

export const reorderTasteSignalsSchema = z.object({
  /** Array of { id, order } pairs */
  signals: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int().min(0),
    }),
  ).min(1),
});
