import { z } from 'zod';
import { BookingStatus } from './booking.model';

export const listBookingsQuerySchema = z.object({
  status: z.enum(Object.values(BookingStatus) as [BookingStatus, ...BookingStatus[]]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
