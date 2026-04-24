// Outbox model for reliable event dispatch
// Prevents loss of domain events when API writes succeed but downstream handling fails

import mongoose, { Document, Schema } from 'mongoose';
import { DomainEvent, DomainEventType } from './domain-events';

export interface IOutboxEntry {
  eventId: string;
  eventType: DomainEventType;
  payload: unknown;
  correlationId: string;
  userId?: string;
  status: 'pending' | 'processing' | 'delivered' | 'failed' | 'poison';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface IOutboxEntryDocument extends Document, Omit<IOutboxEntry, 'id'> {}

const outboxEntrySchema = new Schema<IOutboxEntryDocument>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'JOURNEY_PUBLISHED',
        'JOURNEY_UNPUBLISHED',
        'JOURNEY_UPDATED',
        'DISCOVERY_LIKED',
        'DISCOVERY_UNLIKED',
        'RESONANCE_CREATED',
        'RESONANCE_UPDATED',
        'TASTE_SIGNAL_CHANGED',
        'USER_PRESENCE_CHANGED',
        'MESSAGE_SENT',
        'BOOKING_CREATED',
        'BOOKING_CONFIRMED',
      ],
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    correlationId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'delivered', 'failed', 'poison'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      required: true,
      default: 5,
    },
    lastError: {
      type: String,
    },
    nextRetryAt: {
      type: Date,
      index: true,
    },
    deliveredAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Index for polling dispatcher
outboxEntrySchema.index({ status: 1, nextRetryAt: 1 });

export const OutboxEntryModel = mongoose.model<IOutboxEntryDocument>(
  'OutboxEntry',
  outboxEntrySchema
);

/**
 * Convert a DomainEvent to an OutboxEntry
 */
export function domainEventToOutboxEntry(event: DomainEvent): IOutboxEntry {
  return {
    eventId: event.id,
    eventType: event.type,
    payload: event.payload,
    correlationId: event.correlationId,
    userId: event.userId,
    status: 'pending',
    attempts: 0,
    maxAttempts: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: event.metadata,
  };
}

/**
 * Convert an OutboxEntry back to a DomainEvent
 */
export function outboxEntryToDomainEvent(entry: IOutboxEntry): DomainEvent {
  return {
    id: entry.eventId,
    type: entry.eventType,
    payload: entry.payload,
    timestamp: entry.createdAt,
    correlationId: entry.correlationId,
    userId: entry.userId,
    metadata: entry.metadata,
  };
}
