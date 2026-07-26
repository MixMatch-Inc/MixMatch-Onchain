import type { AuditAction, AuditEntry, AuditStore } from './audit.types.js';

export class InMemoryAuditStore implements AuditStore {
  private readonly entries: AuditEntry[] = [];

  async write(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async findByActor(actorId: string, limit = 50): Promise<AuditEntry[]> {
    return this.entries
      .filter((e) => e.actorId === actorId)
      .reverse()
      .slice(0, limit);
  }

  async findByResource(resourceId: string, limit = 50): Promise<AuditEntry[]> {
    return this.entries
      .filter((e) => e.resourceId === resourceId)
      .reverse()
      .slice(0, limit);
  }

  async countByAction(action: AuditAction): Promise<number> {
    return this.entries.filter((e) => e.action === action).length;
  }
}
