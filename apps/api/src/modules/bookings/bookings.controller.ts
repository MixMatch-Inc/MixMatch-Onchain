import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { UserRole } from '@mixmatch/types';
import Booking, { BookingStatus, PaymentStatus } from './booking.model';
import { createBookingSchema } from './bookings.validation';
import User from '../users/user.model';
import DjProfile from '../profiles/dj.model';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
    return;
  }

  if (req.user.role !== UserRole.PLANNER) {
    res.status(403).json({ message: 'Forbidden: only planners can create bookings' });
    return;
  }

  const parsedPayload = createBookingSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    res.status(400).json({
      message: 'Validation failed',
      errors: parsedPayload.error.flatten(),
    });
    return;
  }

  try {
    const djUser = await User.findById(parsedPayload.data.djId).lean();

    if (!djUser || djUser.role !== UserRole.DJ || !djUser.onboardingCompleted) {
      res.status(404).json({ message: 'Target DJ was not found' });
      return;
    }

    const djProfile = await DjProfile.findOne({
      user: new mongoose.Types.ObjectId(parsedPayload.data.djId),
    }).lean();

    if (!djProfile) {
      res.status(404).json({ message: 'Target DJ was not found' });
      return;
    }

    const booking = await Booking.create({
      planner: new mongoose.Types.ObjectId(req.user.userId),
      dj: new mongoose.Types.ObjectId(parsedPayload.data.djId),
      eventType: parsedPayload.data.eventType,
      eventDate: new Date(parsedPayload.data.eventDate),
      budget: parsedPayload.data.budget,
      notes: parsedPayload.data.notes,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.NOT_STARTED,
    });

    res.status(201).json({
      booking: {
        id: booking.id,
        planner: booking.planner,
        dj: booking.dj,
        eventType: booking.eventType,
        eventDate: booking.eventDate,
        budget: booking.budget,
        notes: booking.notes,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
    });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
};
