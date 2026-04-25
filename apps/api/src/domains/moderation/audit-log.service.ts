import { AuditLog, AuditAction, IAuditLogEntry } from './audit-log.model';

export interface AuditParams {
  action: AuditAction;
  actorId: string;
  targetId: string;
  reason?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogService {
  async log(params: AuditParams): Promise<void> {
    await AuditLog.create(params);
  }

  async findByActor(actorId: string): Promise<IAuditLogEntry[]> {
    return AuditLog.find({ actorId }).sort({ createdAt: -1 }).lean();
  }

  async findByTarget(targetId: string): Promise<IAuditLogEntry[]> {
    return AuditLog.find({ targetId }).sort({ createdAt: -1 }).lean();
  }
}

export const auditLogService = new AuditLogService();
