import mongoose, { Document, Schema } from 'mongoose';
import {
  AvailabilityStatus,
  DjGenre,
  IDjProfile,
  ISocialLinks,
} from '@mixmatch/types';

interface IPricing {
  min: number;
  max: number;
}

export interface IDjProfileDocument extends Omit<IDjProfile, 'id' | 'createdAt' | 'updatedAt'>, Document {
  user: mongoose.Types.ObjectId;
  pricing: IPricing;
  socialLinks?: ISocialLinks;
  createdAt: Date;
  updatedAt: Date;
}

const PricingSchema = new Schema<IPricing>(
  {
    min: {
      type: Number,
      required: [true, 'Minimum price is required'],
      min: [0, 'Minimum price cannot be negative'],
    },
    max: {
      type: Number,
      required: [true, 'Maximum price is required'],
      min: [0, 'Maximum price cannot be negative'],
      validate: {
        validator(this: IPricing, value: number): boolean {
          return typeof this.min === 'number' ? value >= this.min : true;
        },
        message: 'Maximum price must be greater than or equal to minimum price',
      },
    },
  },
  { _id: false },
);

const SocialLinksSchema = new Schema<ISocialLinks>(
  {
    instagram: { type: String, trim: true },
    soundcloud: { type: String, trim: true },
    youtube: { type: String, trim: true },
    spotify: { type: String, trim: true },
    website: { type: String, trim: true },
  },
  { _id: false },
);

const DjProfileSchema = new Schema<IDjProfileDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
      immutable: true,
    },
    stageName: {
      type: String,
      required: [true, 'Stage name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Stage name must be at least 2 characters'],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
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
    pricing: {
      type: PricingSchema,
      required: [true, 'Pricing is required'],
    },
    location: {
      type: Schema.Types.Mixed,
      validate: {
        validator(value: unknown): boolean {
          if (value === null || value === undefined) {
            return true;
          }

          if (typeof value === 'string') {
            return value.trim().length > 0;
          }

          if (typeof value === 'object') {
            const maybeGeo = value as {
              type?: string;
              coordinates?: unknown;
            };

            if (maybeGeo.type !== 'Point' || !Array.isArray(maybeGeo.coordinates)) {
              return false;
            }

            return (
              maybeGeo.coordinates.length === 2
              && maybeGeo.coordinates.every((coordinate) => typeof coordinate === 'number')
            );
          }

          return false;
        },
        message: 'Location must be a non-empty string or GeoJSON Point',
      },
    },
    availabilityStatus: {
      type: String,
      enum: Object.values(AvailabilityStatus),
      default: AvailabilityStatus.AVAILABLE,
    },
    socialLinks: {
      type: SocialLinksSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

const DjProfile = mongoose.model<IDjProfileDocument>('DjProfile', DjProfileSchema);

export default DjProfile;
