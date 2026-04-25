import mongoose, { Document, Schema } from 'mongoose';

export interface ISnapshotSlot {
  order: number;
  trackRef: string;
  platform: string;
  notes?: string;
}

export interface IJourneySnapshotDocument extends Document {
  journeyId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  slots: ISnapshotSlot[];
  draftVersion: number;
  createdAt: Date;
}

const SnapshotSlotSchema = new Schema<ISnapshotSlot>(
  {
    order: { type: Number, required: true },
    trackRef: { type: String, required: true, trim: true },
    platform: { type: String, required: true, trim: true, lowercase: true },
    notes: { type: String, trim: true },
  },
  { _id: false },
);

const JourneySnapshotSchema = new Schema<IJourneySnapshotDocument>(
  {
    journeyId: {
      type: Schema.Types.ObjectId,
      ref: 'VibeJourney',
      required: true,
      index: true,
      immutable: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },
    description: {
      type: String,
      trim: true,
      immutable: true,
    },
    slots: {
      type: [SnapshotSlotSchema],
      required: true,
      immutable: true,
    },
    draftVersion: {
      type: Number,
      required: true,
      immutable: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Unique constraint prevents duplicate snapshots for the same draft version
JourneySnapshotSchema.index({ journeyId: 1, draftVersion: 1 }, { unique: true });

const JourneySnapshot = mongoose.model<IJourneySnapshotDocument>('JourneySnapshot', JourneySnapshotSchema);

export default JourneySnapshot;
