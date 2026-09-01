import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DATABASE } from '../../db/db.module';
import * as schema from '../../db/schema';
import type { Database } from '../../db/client';

export type AdminAuditAction = 'transaction.approve' | 'transaction.reject';
export type AdminAuditOutcome = 'SUCCESS' | 'FAILURE';

export interface AdminAuditLogRecord {
  id: string;
  actorUserId: string;
  action: AdminAuditAction;
  targetType: string;
  targetId: string;
  outcome: AdminAuditOutcome;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/**
 * Append-only store for privileged admin decisions. Nothing here updates or
 * deletes: an audit trail that can be edited by the system that writes it
 * isn't one.
 */
@Injectable()
export class AdminAuditRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async record(input: {
    actorUserId: string;
    action: AdminAuditAction;
    targetType: string;
    targetId: string;
    outcome: AdminAuditOutcome;
    metadata?: Record<string, unknown>;
  }): Promise<AdminAuditLogRecord> {
    const [row] = await this.db
      .insert(schema.adminAuditLogs)
      .values({
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        outcome: input.outcome,
        metadata: input.metadata ?? null,
      })
      .returning();
    if (!row) {
      throw new Error('Failed to write admin audit log entry');
    }
    return row;
  }

  /** Every recorded decision against one target, newest first. */
  async findForTarget(
    targetType: string,
    targetId: string,
  ): Promise<AdminAuditLogRecord[]> {
    return this.db
      .select()
      .from(schema.adminAuditLogs)
      .where(
        and(
          eq(schema.adminAuditLogs.targetType, targetType),
          eq(schema.adminAuditLogs.targetId, targetId),
        ),
      )
      .orderBy(desc(schema.adminAuditLogs.createdAt));
  }
}
