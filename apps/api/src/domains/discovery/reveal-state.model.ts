import mongoose, { Document, Schema } from 'mongoose';
import { RevealPhase, RevealTrigger } from '@mixmatch/types';

export interface IRevealStateDocument extends Document {
  viewerId: mongoose.Types.ObjectId;
  targetProfileId: mongoose.Types.ObjectId;
  targetProfileType: 'dj' | 'planner' | 'lover';
  currentPhase: RevealPhase;
  revealTriggers: RevealTrigger[];
  revealTimestamps: Map<RevealPhase, Date | null>;
  blockedReason?: string;
  blockedBy?: mongoose.Types.ObjectId;
  blockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RevealStateSchema = new Schema<IRevealStateDocument>(
  {
    viewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Viewer ID is required'],
      index: true,
    },
    targetProfileId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Target profile ID is required'],
      index: true,
    },
    targetProfileType: {
      type: String,
      enum: ['dj', 'planner', 'lover'],
      required: [true, 'Target profile type is required'],
      index: true,
    },
    currentPhase: {
      type: String,
      enum: Object.values(RevealPhase),
      default: RevealPhase.BLIND,
      required: true,
    },
    revealTriggers: {
      type: [String],
      enum: Object.values(RevealTrigger),
      default: [],
    },
    revealTimestamps: {
      type: Map,
      of: Date,
      default: () => new Map(Object.values(RevealPhase).map(phase => [phase, null])),
    },
    blockedReason: {
      type: String,
      trim: true,
    },
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    blockedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
RevealStateSchema.index({ viewerId: 1, targetProfileId: 1 }, { unique: true });
RevealStateSchema.index({ targetProfileId: 1, targetProfileType: 1 });

const RevealState = mongoose.model<IRevealStateDocument>('RevealState', RevealStateSchema);

export default RevealState;
