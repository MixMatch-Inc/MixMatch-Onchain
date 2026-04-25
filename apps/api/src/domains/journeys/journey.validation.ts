import { z } from 'zod';

export const journeySlotSchema = z.object({
  order: z.number().int().min(0, 'Slot order must be non-negative'),
  trackRef: z.string().min(1, 'Track reference is required').trim(),
  platform: z.string().min(1, 'Platform is required').trim().toLowerCase(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').trim().optional(),
});

export const createDraftJourneySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').trim(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').trim().optional(),
});

export const updateSlotsSchema = z.object({
  slots: z
    .array(journeySlotSchema)
    .min(1, 'At least one slot is required')
    .refine(
      (slots) => {
        const orders = slots.map((s) => s.order);
        return new Set(orders).size === orders.length;
      },
      { message: 'Slot order values must be unique' },
    )
    .refine(
      (slots) => {
        const sorted = [...slots].map((s) => s.order).sort((a, b) => a - b);
        return sorted.every((val, i) => val === i);
      },
      { message: 'Slot orders must form a contiguous sequence starting at 0' },
    ),
  version: z.number().int().min(1, 'Version must be a positive integer'),
});

export type CreateDraftJourneyDto = z.infer<typeof createDraftJourneySchema>;
export type UpdateSlotsDto = z.infer<typeof updateSlotsSchema>;
