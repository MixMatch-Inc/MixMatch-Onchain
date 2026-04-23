import mongoose, { Document, Schema } from 'mongoose';
import { EventType } from '@mixmatch/types';

export enum BookingStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export interface IBookingDocument extends Document {
  planner: mongoose.Types.ObjectId;
  dj: mongoose.Types.ObjectId;
  eventType: EventType;
  eventDate: Date;
  budget: number;
  notes?: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  responseNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBookingDocument>(
  {
    planner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    dj: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    eventType: {
      type: String,
      enum: Object.values(EventType),
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
      index: true,
    },
    budget: {
      type: Number,
      required: true,
      min: [0, 'Budget cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.NOT_STARTED,
      index: true,
    },
    responseNote: {
      type: String,
      trim: true,
      maxlength: [1000, 'Response note cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  },
);

BookingSchema.index({ planner: 1, status: 1, createdAt: -1 });
BookingSchema.index({ dj: 1, status: 1, createdAt: -1 });
BookingSchema.index({ planner: 1, dj: 1, eventDate: 1 });

const Booking = mongoose.model<IBookingDocument>('Booking', BookingSchema);

export default Booking;
