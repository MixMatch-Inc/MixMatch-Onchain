import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, AccountStatus, ModerationState, VisibilityPreference, IPrivacySettings } from '@mixmatch/types';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  onboardingCompleted: boolean;
  accountStatus: AccountStatus;
  timezone: string;
  locale: string;
  visibilityPreference: VisibilityPreference;
  ageGatePassed: boolean;
  ageGatePassedAt?: Date;
  moderationState: ModerationState;
  privacySettings: IPrivacySettings;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PrivacySettingsSchema = new Schema<IPrivacySettings>(
  {
    blindListeningEligible: {
      type: Boolean,
      default: true,
    },
    profileRevealAllowed: {
      type: Boolean,
      default: true,
    },
    showOnlineStatus: {
      type: Boolean,
      default: true,
    },
    allowDirectMessages: {
      type: Boolean,
      default: true,
    },
    visibilityPreference: {
      type: String,
      enum: Object.values(VisibilityPreference),
      default: VisibilityPreference.PUBLIC,
    },
  },
  { _id: false },
);

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: [true, 'Role is required'],
      immutable: true,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    accountStatus: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.PENDING_VERIFICATION,
    },
    timezone: {
      type: String,
      default: 'UTC',
      validate: {
        validator: (v: string) => /^[\w/+-]+$/.test(v), // Basic timezone validation
        message: 'Invalid timezone format',
      },
    },
    locale: {
      type: String,
      default: 'en-US',
      validate: {
        validator: (v: string) => /^[a-z]{2}(-[A-Z]{2})?$/.test(v),
        message: 'Invalid locale format (expected: en-US)',
      },
    },
    visibilityPreference: {
      type: String,
      enum: Object.values(VisibilityPreference),
      default: VisibilityPreference.PUBLIC,
    },
    ageGatePassed: {
      type: Boolean,
      default: false,
    },
    ageGatePassedAt: {
      type: Date,
    },
    moderationState: {
      type: String,
      enum: Object.values(ModerationState),
      default: ModerationState.CLEAR,
    },
    privacySettings: {
      type: PrivacySettingsSchema,
      default: () => ({}),
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model<IUserDocument>('User', UserSchema);
export default User;
