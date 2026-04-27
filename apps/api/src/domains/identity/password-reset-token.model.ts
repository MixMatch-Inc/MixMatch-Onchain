import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordResetTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  /** SHA-256 hex digest of the raw 32-byte token */
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  /** IP address that requested the reset */
  requestIp?: string;
  /** User agent that requested the reset */
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetTokenDocument>(
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
      index: { expireAfterSeconds: 0 },
    },
    consumedAt: { type: Date },
    requestIp: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

// Compound index for "find active token for a user"
PasswordResetTokenSchema.index(
  { userId: 1, consumedAt: 1, expiresAt: 1 },
);

const PasswordResetToken = mongoose.model<IPasswordResetTokenDocument>(
  'PasswordResetToken',
  PasswordResetTokenSchema,
);

export default PasswordResetToken;
