import { randomUUID } from 'node:crypto';
import type { AuditAction, AuditEntry } from './audit.types.js';
import type { AuditStore } from './audit.types.js';

export class AuditService {
  constructor(private readonly store: AuditStore) {}

  async record(action: AuditAction, context: {
    actorId?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    const entry: AuditEntry = {
      id: randomUUID(),
      action,
      actorId: context.actorId,
      resourceId: context.resourceId,
      metadata: context.metadata,
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: new Date().toISOString(),
    };
    await this.store.write(entry);
  }

  async findByActor(actorId: string, limit = 50): Promise<AuditEntry[]> {
    return this.store.findByActor(actorId, limit);
  }

  async findByResource(resourceId: string, limit = 50): Promise<AuditEntry[]> {
    return this.store.findByResource(resourceId, limit);
  }

  async countByAction(action: AuditAction): Promise<number> {
    return this.store.countByAction(action);
  }
}
