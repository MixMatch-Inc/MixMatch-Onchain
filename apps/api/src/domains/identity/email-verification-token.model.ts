import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailVerificationTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  /** SHA-256 hex digest of the raw 32-byte token */
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  supersededAt?: Date;
  /** _id (stringified) of the token that triggered this resend */
  resendLineage?: string;
  resendCount: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmailVerificationTokenSchema = new Schema<IEmailVerificationTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // MongoDB TTL index: documents are automatically reaped after expiry.
      // This is a background reaper — application logic must also check expiry.
      index: { expireAfterSeconds: 0 },
    },
    consumedAt: { type: Date },
    supersededAt: { type: Date },
    resendLineage: { type: String },
    resendCount: { type: Number, default: 0 },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

// Compound index for "find active token for a user"
EmailVerificationTokenSchema.index(
  { userId: 1, consumedAt: 1, supersededAt: 1, expiresAt: 1 },
);

const EmailVerificationToken = mongoose.model<IEmailVerificationTokenDocument>(
  'EmailVerificationToken',
  EmailVerificationTokenSchema,
);

export default EmailVerificationToken;
