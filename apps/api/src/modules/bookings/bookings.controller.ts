import { Request, Response } from 'express';
import { UserRole } from '@mixmatch/types';
import Booking, { BookingStatus, IBookingDocument } from './booking.model';
import { updateBookingStatusSchema } from './bookings.validation';

const serializeBooking = (booking: IBookingDocument) => ({
  id: String(booking._id),
  planner: booking?.planner,
  dj: booking?.dj,
  eventType: booking?.eventType,
  eventDate: booking?.eventDate,
  budget: booking?.budget,
  notes: booking?.notes,
  status: booking?.status,
  paymentStatus: booking?.paymentStatus,
  responseNote: booking?.responseNote,
  createdAt: booking?.createdAt,
  updatedAt: booking?.updatedAt,
});

export const getBookingDetail = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404).json({ message: 'Booking not found' });
    return;
  }

  const isPlanner = String(booking.planner) === req.user.userId;
  const isDj = String(booking.dj) === req.user.userId;

  if (!isPlanner && !isDj) {
    res.status(403).json({ message: 'Forbidden: booking is not accessible to this user' });
    return;
  }

  res.status(200).json({ booking: serializeBooking(booking) });
};

export const updateBookingStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  if (req.user.role !== UserRole.DJ) {
    res.status(403).json({ message: 'Forbidden: only DJs can update booking status' });
    return;
  }

  const parsedPayload = updateBookingStatusSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    res.status(400).json({
      message: 'Validation failed',
      errors: parsedPayload.error.flatten(),
    });
    return;
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404).json({ message: 'Booking not found' });
    return;
  }

  if (String(booking.dj) !== req.user.userId) {
    res.status(403).json({ message: 'Forbidden: booking does not belong to this DJ' });
    return;
  }

  if (booking.status !== BookingStatus.PENDING) {
    res.status(409).json({ message: 'Only pending bookings can be updated' });
    return;
  }

  booking.status = parsedPayload.data.status;
  booking.responseNote = parsedPayload.data.responseNote;
  await booking.save();

  res.status(200).json({ booking: serializeBooking(booking) });
};
