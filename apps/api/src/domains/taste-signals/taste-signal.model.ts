import mongoose, { Document, Schema } from 'mongoose';

export enum TasteSignalCategory {
  ALBUM = 'ALBUM',
  ARTIST = 'ARTIST',
  CONCERT_MEMORY = 'CONCERT_MEMORY',
  GENRE = 'GENRE',
  VIBE = 'VIBE',
}

export interface ITasteSignalDocument extends Document {
  owner: mongoose.Types.ObjectId;
  category: TasteSignalCategory;
  label: string;
  /** Required for ALBUM — external provider reference (e.g. Spotify URI) */
  providerRef?: string;
  /** Optional narrative for CONCERT_MEMORY */
  narrative?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TasteSignalSchema = new Schema<ITasteSignalDocument>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(TasteSignalCategory),
      required: [true, 'Category is required'],
      index: true,
    },
    label: {
      type: String,
      required: [true, 'Label is required'],
      trim: true,
      maxlength: [200, 'Label cannot exceed 200 characters'],
    },
    providerRef: {
      type: String,
      trim: true,
    },
    narrative: {
      type: String,
      trim: true,
      maxlength: [2000, 'Narrative cannot exceed 2000 characters'],
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true },
);

TasteSignalSchema.index({ owner: 1, category: 1, order: 1 });

const TasteSignal = mongoose.model<ITasteSignalDocument>('TasteSignal', TasteSignalSchema);
export default TasteSignal;
