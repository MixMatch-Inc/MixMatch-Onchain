import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'WALLET_LINKED'
  | 'WALLET_UNLINKED'
  | 'PROFILE_REVEAL_OVERRIDE'
  | 'MODERATION_TRANSITION'
  | 'ENTITLEMENT_GRANTED'
  | 'ENTITLEMENT_CONSUMED'
  | 'ACCOUNT_PRIVACY_CHANGED'
  | 'USER_LOGGED_OUT'
  | 'USER_LOGGED_OUT_ALL'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_CHANGE_FAILED';

export interface IAuditLogEntry {
  action: AuditAction;
  actorId: string;
  targetId: string;
  reason?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IAuditLogDocument extends IAuditLogEntry, Document {}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    action: { type: String, required: true, index: true },
    actorId: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    reason: { type: String },
    correlationId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
