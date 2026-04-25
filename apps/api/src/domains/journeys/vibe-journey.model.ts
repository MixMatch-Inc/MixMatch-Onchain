import mongoose, { Document, Schema } from 'mongoose';
import { ModerationState } from '@mixmatch/types';

export enum JourneyStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface IJourneySlot {
  order: number;
  trackRef: string;
  platform: string;
  notes?: string;
}

export interface IVibeJourneyDocument extends Document {
  author: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: JourneyStatus;
  slots: IJourneySlot[];
  version: number;
  latestPublishedSnapshotId?: mongoose.Types.ObjectId;
  moderationState: ModerationState;
  moderationReason?: string;
  moderationReviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JourneySlotSchema = new Schema<IJourneySlot>(
  {
    order: {
      type: Number,
      required: true,
      min: [0, 'Slot order must be non-negative'],
    },
    trackRef: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Slot notes cannot exceed 1000 characters'],
    },
  },
  { _id: false },
);

const VibeJourneySchema = new Schema<IVibeJourneyDocument>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    title: {
      type: String,
      required: [true, 'Journey title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(JourneyStatus),
      default: JourneyStatus.DRAFT,
      index: true,
    },
    slots: {
      type: [JourneySlotSchema],
      default: [],
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    latestPublishedSnapshotId: {
      type: Schema.Types.ObjectId,
      ref: 'JourneySnapshot',
    },
    moderationState: {
      type: String,
      enum: Object.values(ModerationState),
      default: ModerationState.CLEAR,
      index: true,
    },
    moderationReason: { type: String },
    moderationReviewedAt: { type: Date },
  },
  { timestamps: true },
);

VibeJourneySchema.index({ author: 1, status: 1, createdAt: -1 });

const VibeJourney = mongoose.model<IVibeJourneyDocument>('VibeJourney', VibeJourneySchema);

export default VibeJourney;
