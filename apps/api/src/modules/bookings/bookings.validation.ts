import { z } from 'zod';
import { BookingStatus } from './booking.model';

export const updateBookingStatusSchema = z.object({
  status: z.enum([BookingStatus.ACCEPTED, BookingStatus.DECLINED]),
  responseNote: z.string().trim().max(1000).optional(),
});
