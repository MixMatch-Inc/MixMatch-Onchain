import { Controller, Get, Inject } from '@nestjs/common';
import { DATABASE } from '../../db/db.module';
import type { Database } from '../../db/client';
import { sql } from 'drizzle-orm';

/**
 * Lightweight health-check endpoint for container orchestration
 * liveness/readiness probes (#921).
 * `GET /health` — no authentication required.
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  async check(): Promise<{ status: 'ok' | 'error'; db: 'ok' | 'error'; uptime: number }> {
    let dbStatus: 'ok' | 'error' = 'error';
    try {
      await this.db.execute(sql`SELECT 1`);
      dbStatus = 'ok';
    } catch {
      // DB unreachable — report degraded but still return 200 so the
      // container doesn't restart when the DB is temporarily unavailable.
    }
    return {
      status: dbStatus === 'ok' ? 'ok' : 'error',
      db: dbStatus,
      uptime: process.uptime(),
    };
  }
}
