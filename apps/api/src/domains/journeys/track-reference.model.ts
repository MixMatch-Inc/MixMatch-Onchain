import mongoose, { Document, Schema } from 'mongoose';
import { ProviderType, Artist, Album, Artwork } from '@mixmatch/types';

export interface ITrackReferenceDocument extends Document {
  provider: ProviderType;
  providerTrackId: string;
  title: string;
  artists: Artist[];
  album?: Album;
  durationMs: number;
  previewUrl?: string;
  artwork: Artwork[];
  explicit: boolean;
  audioFeaturesCacheKey?: string;
  rawPayload: Record<string, any>;
  ingestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ArtistSchema = new Schema<Artist>(
  {
    name: {
      type: String,
      required: true,
    },
    providerId: {
      type: String,
    },
  },
  { _id: false },
);

const AlbumSchema = new Schema<Album>(
  {
    name: {
      type: String,
      required: true,
    },
    providerId: {
      type: String,
    },
    releaseDate: {
      type: Date,
    },
  },
  { _id: false },
);

const ArtworkSchema = new Schema<Artwork>(
  {
    url: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
  },
  { _id: false },
);

const TrackReferenceSchema = new Schema<ITrackReferenceDocument>(
  {
    provider: {
      type: String,
      enum: Object.values(ProviderType) as string[],
      required: true,
      index: true,
    },
    providerTrackId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    artists: [ArtistSchema],
    album: AlbumSchema,
    durationMs: {
      type: Number,
      required: true,
      min: [0, 'Duration must be non-negative'],
    },
    previewUrl: {
      type: String,
    },
    artwork: [ArtworkSchema],
    explicit: {
      type: Boolean,
      required: true,
    },
    audioFeaturesCacheKey: {
      type: String,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    ingestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Unique index to de-duplicate provider references
TrackReferenceSchema.index({ provider: 1, providerTrackId: 1 }, { unique: true });

// Additional indexes for common queries
TrackReferenceSchema.index({ title: 'text', 'artists.name': 'text' }); // for search
TrackReferenceSchema.index({ ingestedAt: -1 }); // for recent tracks

const TrackReference = mongoose.model<ITrackReferenceDocument>('TrackReference', TrackReferenceSchema);

export default TrackReference;