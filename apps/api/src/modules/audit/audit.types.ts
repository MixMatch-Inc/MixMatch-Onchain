import type { AuditAction, AuditEntry } from '@mixmatch/shared';

export type { AuditAction, AuditEntry };

export interface AuditStore {
  write(entry: AuditEntry): Promise<void>;
  findByActor(actorId: string, limit?: number): Promise<AuditEntry[]>;
  findByResource(resourceId: string, limit?: number): Promise<AuditEntry[]>;
  countByAction(action: AuditAction): Promise<number>;
}
