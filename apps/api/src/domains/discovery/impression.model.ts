import mongoose, { Document, Schema } from 'mongoose';

export type ImpressionEventType =
  | 'slot_start'
  | 'slot_complete'
  | 'slot_skip'
  | 'reaction'
  | 'like'
  | 'hide'
  | 'journey_exit';

export interface IImpression {
  viewerId: mongoose.Types.ObjectId;
  targetProfileId: mongoose.Types.ObjectId;
  eventType: ImpressionEventType;
  clientEventId: string; // client-generated idempotency key
  occurredAt: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IImpressionDocument extends IImpression, Document {}

const ImpressionSchema = new Schema<IImpressionDocument>(
  {
    viewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetProfileId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ['slot_start', 'slot_complete', 'slot_skip', 'reaction', 'like', 'hide', 'journey_exit'],
      required: true,
    },
    clientEventId: {
      type: String,
      required: true,
    },
    occurredAt: {
      type: Date,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

// Unique index for deduplication by viewer + clientEventId
ImpressionSchema.index({ viewerId: 1, clientEventId: 1 }, { unique: true });

const Impression = mongoose.model<IImpressionDocument>('Impression', ImpressionSchema);
export default Impression;
