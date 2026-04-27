import crypto from 'crypto';
import { AuthAudit, AuthSecurityEventType, IAuthAuditEntry, RemediationStatus } from './auth-audit.model';

export interface AuthAuditParams {
  eventType: AuthSecurityEventType;
  userId: string;
  /** Raw IP address — will be hashed before storage */
  ipAddress?: string;
  /** Raw user-agent — will be truncated before storage */
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/** One-way hash of an IP address for storage without storing PII */
function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export class AuthAuditService {
  async log(params: AuthAuditParams): Promise<void> {
    const ipSummary = params.ipAddress ? hashIp(params.ipAddress) : undefined;
    const deviceFingerprint = params.userAgent
      ? params.userAgent.slice(0, 256)
      : undefined;

    await AuthAudit.create({
      eventType: params.eventType,
      userId: params.userId,
      ipSummary,
      deviceFingerprint,
      remediationStatus: 'PENDING' as RemediationStatus,
      metadata: params.metadata,
    });
  }

  async findByUser(userId: string): Promise<IAuthAuditEntry[]> {
    return AuthAudit.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async findPendingSuspicious(userId: string): Promise<IAuthAuditEntry[]> {
    return AuthAudit.find({
      userId,
      eventType: { $in: ['SUSPICIOUS_LOGIN', 'ACCOUNT_LOCKED', 'DEVICE_CHANGE_DETECTED'] },
      remediationStatus: 'PENDING',
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  async updateRemediation(id: string, status: RemediationStatus): Promise<void> {
    await AuthAudit.findByIdAndUpdate(id, { $set: { remediationStatus: status } });
  }
}

export const authAuditService = new AuthAuditService();
