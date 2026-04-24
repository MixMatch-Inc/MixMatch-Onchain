import mongoose, { Document, Schema } from 'mongoose';
import { JourneyStatus, JourneySlot } from '@mixmatch/types';

export interface IVibeJourneyDocument extends Document {
  author: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: JourneyStatus;
  version: number;
  publishedAt?: Date;
  slots: JourneySlot[];
  createdAt: Date;
  updatedAt: Date;
}

const JourneySlotSchema = new Schema<JourneySlot>(
  {
    order: {
      type: Number,
      required: true,
      min: [0, 'Order must be non-negative'],
    },
    trackId: {
      type: String,
      required: true,
      index: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [500, 'Caption cannot exceed 500 characters'],
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
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(JourneyStatus) as string[],
      default: JourneyStatus.DRAFT,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
    },
    publishedAt: {
      type: Date,
      index: true,
    },
    slots: [JourneySlotSchema],
  },
  {
    timestamps: true,
  },
);

// Indexes for author lookup
VibeJourneySchema.index({ author: 1, status: 1, updatedAt: -1 });

// Indexes for latest-published retrieval
VibeJourneySchema.index({ status: JourneyStatus.PUBLISHED, publishedAt: -1 });

// Ensure published journeys are immutable by preventing updates when status is PUBLISHED
VibeJourneySchema.pre('save', function (next) {
  if (this.isModified() && this.status === JourneyStatus.PUBLISHED) {
    // For published journeys, only allow updates to certain fields if needed, but generally prevent
    // Since published are snapshots, perhaps throw error
    const modifiedPaths = this.modifiedPaths();
    const allowedPaths = ['updatedAt']; // timestamps are auto-updated
    const hasDisallowedModifications = modifiedPaths.some(path => !allowedPaths.includes(path));
    if (hasDisallowedModifications) {
      return next(new Error('Published journeys cannot be modified'));
    }
  }
  next();
});

const VibeJourney = mongoose.model<IVibeJourneyDocument>('VibeJourney', VibeJourneySchema);

export default VibeJourney;