import mongoose, { Document, Schema } from 'mongoose';
import { DjGenre, ILoverProfile } from '@mixmatch/types';

export interface ILoverProfileDocument extends Omit<ILoverProfile, 'id' | 'createdAt' | 'updatedAt'>, Document {
  user: mongoose.Types.ObjectId;
  followedDjs: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const LoverProfileSchema = new Schema<ILoverProfileDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
      immutable: true,
    },
    favoriteGenres: {
      type: [String],
      enum: Object.values(DjGenre),
      default: [],
    },
    preferredVibes: {
      type: [String],
      default: [],
    },
    followedDjs: {
      type: [Schema.Types.ObjectId],
      ref: 'DjProfile',
      default: [],
    },
  },
  {
    timestamps: true,
  },
);
apps/api/src/modules/profiles/lover.model.ts
const LoverProfile = mongoose.model<ILoverProfileDocument>('LoverProfile', LoverProfileSchema);

export default LoverProfile;
