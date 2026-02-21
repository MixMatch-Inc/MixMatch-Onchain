import mongoose, { Document, Schema } from 'mongoose';
import { EventType, IPlannerProfile } from '@mixmatch/types';

type IPlannerProfileDocumentFields = Omit<IPlannerProfile, 'id' | 'user' | 'createdAt' | 'updatedAt'> & {
  user: mongoose.Types.ObjectId;
};

export interface IPlannerProfileDocument extends IPlannerProfileDocumentFields, Document {}

const PlannerProfileSchema = new Schema<IPlannerProfileDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
      immutable: true,
    },
    organizationName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Organization name must be at least 2 characters'],
      maxlength: [200, 'Organization name cannot exceed 200 characters'],
    },
    typicalEventTypes: {
      type: [String],
      enum: Object.values(EventType),
      default: [],
    },
    website: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const PlannerProfile = mongoose.model<IPlannerProfileDocument>('PlannerProfile', PlannerProfileSchema);

export default PlannerProfile;
