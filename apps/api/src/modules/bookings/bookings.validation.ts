import { z } from 'zod';
import { EventType } from '@mixmatch/types';

export const createBookingSchema = z.object({
  djId: z.string().trim().min(1),
  eventType: z.enum(Object.values(EventType) as [EventType, ...EventType[]]),
  eventDate: z.string().datetime(),
  budget: z.number().min(0),
  notes: z.string().trim().max(2000).optional(),
});
