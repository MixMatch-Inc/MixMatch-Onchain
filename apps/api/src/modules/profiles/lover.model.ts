import mongoose, { Document, Schema } from 'mongoose';
import { DjGenre, ILoverProfile } from '@mixmatch/types';

type ILoverProfileDocumentFields = Omit<ILoverProfile, 'id' | 'user' | 'followedDjs' | 'createdAt' | 'updatedAt'> & {
  user: mongoose.Types.ObjectId;
  followedDjs: mongoose.Types.ObjectId[];
};

export interface ILoverProfileDocument extends ILoverProfileDocumentFields, Document {}

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

const LoverProfile = mongoose.model<ILoverProfileDocument>('LoverProfile', LoverProfileSchema);

export default LoverProfile;
