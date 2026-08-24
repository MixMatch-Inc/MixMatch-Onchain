import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import type { TransactionRecord } from './transaction.repository';

/**
 * Periodically re-checks stuck PENDING transactions against Horizon so they
 * resolve without a client ever having to poll `GET /:id/status` or call
 * `POST /:id/reconcile` themselves. See `PaymentsService.reconcileTransaction`
 * for the actual matching/escalation logic — this job is just the scheduler.
 */
@Injectable()
export class ReconciliationJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliationJob.name);
  private timer?: ReturnType<typeof setInterval>;
  private isRunning = false;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.configService.getOrThrow<number>(
      'reconciliationIntervalMs',
    );
    this.timer = setInterval(() => {
      void this.runOnce();
    }, intervalMs);
    // Don't let this timer keep the process alive on its own (relevant for
    // graceful shutdown / short-lived test runs).
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * Runs one reconciliation pass. Skips (rather than queues) if the previous
   * pass is still in flight, so a slow Horizon response can't cause passes
   * to pile up concurrently against the same rows.
   */
  async runOnce(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Skipping reconciliation pass: the previous pass is still running',
      );
      return;
    }

    this.isRunning = true;
    const start = Date.now();
    try {
      const results = await this.paymentsService.reconcilePendingTransactions();
      this.logger.log(
        `Reconciliation pass processed ${results.length} stale transaction(s) in ${Date.now() - start}ms — ${JSON.stringify(summarizeByStatus(results))}`,
      );
    } catch (error) {
      this.logger.error(
        'Reconciliation pass failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isRunning = false;
    }
  }
}

function summarizeByStatus(
  transactions: TransactionRecord[],
): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const transaction of transactions) {
    summary[transaction.status] = (summary[transaction.status] ?? 0) + 1;
  }
  return summary;
}
