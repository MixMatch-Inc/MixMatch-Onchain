import mongoose, { Document, Schema } from 'mongoose';
import { DjGenre } from '@mixmatch/types';

export enum JourneyVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export interface IJourneyDocument extends Document {
  owner: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  genres: DjGenre[];
  vibeTags: string[];
  visibility: JourneyVisibility;
  privateNotes?: string;
  revealedTo: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const JourneySchema = new Schema<IJourneyDocument>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    genres: {
      type: [String],
      enum: Object.values(DjGenre),
      default: [],
    },
    vibeTags: {
      type: [String],
      default: [],
    },
    visibility: {
      type: String,
      enum: Object.values(JourneyVisibility),
      default: JourneyVisibility.PUBLIC,
      index: true,
    },
    privateNotes: {
      type: String,
      trim: true,
      maxlength: [5000, 'Private notes cannot exceed 5000 characters'],
    },
    revealedTo: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
  },
  { timestamps: true },
);

JourneySchema.index({ owner: 1, visibility: 1, createdAt: -1 });

const Journey = mongoose.model<IJourneyDocument>('Journey', JourneySchema);
export default Journey;
