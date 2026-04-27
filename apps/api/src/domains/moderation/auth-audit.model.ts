import mongoose, { Document, Schema } from 'mongoose';

export type AuthSecurityEventType =
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_CHANGE_FAILED'
  | 'SUSPICIOUS_LOGIN'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'RESET_REQUESTED'
  | 'RESET_COMPLETED'
  | 'VERIFICATION_ISSUED'
  | 'VERIFICATION_CONFIRMED'
  | 'DEVICE_CHANGE_DETECTED'
  | 'SESSION_REVOKED_ALL';

export type RemediationStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED' | 'ESCALATED';

export interface IAuthAuditEntry {
  eventType: AuthSecurityEventType;
  userId: string;
  /** Truncated/hashed IP summary — never store raw PII */
  ipSummary?: string;
  /** UA string (truncated to 256 chars) */
  deviceFingerprint?: string;
  remediationStatus: RemediationStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IAuthAuditDocument extends IAuthAuditEntry, Document {}

const AuthAuditSchema = new Schema<IAuthAuditDocument>(
  {
    eventType: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    ipSummary: { type: String },
    deviceFingerprint: { type: String },
    remediationStatus: {
      type: String,
      enum: ['PENDING', 'RESOLVED', 'DISMISSED', 'ESCALATED'] as RemediationStatus[],
      default: 'PENDING' as RemediationStatus,
      index: true,
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Compound index for querying auth events per user, ordered by time
AuthAuditSchema.index({ userId: 1, createdAt: -1 });
// Index for querying unresolved suspicious events
AuthAuditSchema.index({ eventType: 1, remediationStatus: 1 });

export const AuthAudit = mongoose.model<IAuthAuditDocument>('AuthAudit', AuthAuditSchema);
