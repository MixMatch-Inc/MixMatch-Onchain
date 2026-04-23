import { Request, Response } from 'express';
import { UserRole } from '@mixmatch/types';
import Booking from './booking.model';
import { listBookingsQuerySchema } from './bookings.validation';

const serializeBooking = (booking: Awaited<ReturnType<typeof Booking.findOne>>) => ({
  id: booking?.id,
  planner: booking?.planner,
  dj: booking?.dj,
  eventType: booking?.eventType,
  eventDate: booking?.eventDate,
  budget: booking?.budget,
  notes: booking?.notes,
  status: booking?.status,
  paymentStatus: booking?.paymentStatus,
  createdAt: booking?.createdAt,
  updatedAt: booking?.updatedAt,
});

const buildFilter = (
  userId: string,
  role: UserRole,
  status?: string,
): Record<string, unknown> => {
  const filter: Record<string, unknown> = role === UserRole.DJ
    ? { dj: userId }
    : { planner: userId };

  if (status) {
    filter.status = status;
  }

  return filter;
};

export const listCurrentUserBookings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  if (req.user.role !== UserRole.DJ && req.user.role !== UserRole.PLANNER) {
    res.status(403).json({ message: 'Forbidden: unsupported role for bookings inbox' });
    return;
  }

  const parsedQuery = listBookingsQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    res.status(400).json({
      message: 'Validation failed',
      errors: parsedQuery.error.flatten(),
    });
    return;
  }

  const { status, page, pageSize } = parsedQuery.data;
  const filter = buildFilter(req.user.userId, req.user.role, status);

  try {
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      items: bookings.map((booking) => serializeBooking(booking)),
      page,
      pageSize,
      total,
    });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};
