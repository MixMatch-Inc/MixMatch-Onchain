// Outbox dispatcher for reliable event delivery
// Polls for pending events and dispatches them with retry logic

import { EventBus, getEventBus } from './event-bus';
import { OutboxEntryModel, IOutboxEntryDocument, outboxEntryToDomainEvent } from './outbox.model';
import { DomainEvent } from './domain-events';

export interface OutboxDispatcherConfig {
  pollIntervalMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  poisonMessageThreshold?: number;
}

const DEFAULT_CONFIG: Required<OutboxDispatcherConfig> = {
  pollIntervalMs: 5000, // 5 seconds
  maxRetries: 5,
  retryBackoffMs: 1000, // 1 second base
  poisonMessageThreshold: 10,
};

export class OutboxDispatcher {
  private config: Required<OutboxDispatcherConfig>;
  private eventBus: EventBus;
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(config: OutboxDispatcherConfig = {}, eventBus?: EventBus) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = eventBus || getEventBus();
  }

  /**
   * Start the dispatcher polling loop
   */
  start(): void {
    if (this.isRunning) {
      console.warn('OutboxDispatcher is already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ OutboxDispatcher started');
    this.poll();
  }

  /**
   * Stop the dispatcher polling loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('🛑 OutboxDispatcher stopped');
  }

  /**
   * Save an event to the outbox (should be called within the same transaction as domain mutation)
   */
  async saveToOutbox(event: DomainEvent): Promise<void> {
    try {
      const entry = new OutboxEntryModel({
        eventId: event.id,
        eventType: event.type,
        payload: event.payload,
        correlationId: event.correlationId,
        userId: event.userId,
        status: 'pending',
        attempts: 0,
        maxAttempts: this.config.maxRetries,
        nextRetryAt: new Date(),
        metadata: event.metadata,
      });

      await entry.save();
    } catch (error) {
      // Check for duplicate key error (idempotency protection)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as any).code === 11000
      ) {
        console.log(`⚠️ Duplicate outbox entry for event ${event.id}, skipping`);
        return;
      }
      throw error;
    }
  }

  /**
   * Poll for pending events and dispatch them
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.dispatchPendingEvents();
    } catch (error) {
      console.error('Error in outbox dispatch cycle:', error);
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), this.config.pollIntervalMs);
  }

  /**
   * Dispatch all pending events that are ready for retry
   */
  private async dispatchPendingEvents(): Promise<number> {
    const now = new Date();

    // Find pending/failed events ready for retry
    const pendingEntries = await OutboxEntryModel.find({
      status: { $in: ['pending', 'failed'] },
      $or: [
        { nextRetryAt: { $lte: now } },
        { nextRetryAt: { $exists: false } },
      ],
    }).limit(100); // Batch size

    let dispatchedCount = 0;

    for (const entry of pendingEntries) {
      const success = await this.dispatchEntry(entry);
      if (success) {
        dispatchedCount++;
      }
    }

    return dispatchedCount;
  }

  /**
   * Dispatch a single outbox entry
   */
  private async dispatchEntry(entry: IOutboxEntryDocument): Promise<boolean> {
    try {
      // Mark as processing
      entry.status = 'processing';
      entry.attempts += 1;
      await entry.save();

      // Convert to domain event and publish
      const event = outboxEntryToDomainEvent(entry.toObject());
      await this.eventBus.publish(event);

      // Mark as delivered
      entry.status = 'delivered';
      entry.deliveredAt = new Date();
      await entry.save();

      return true;
    } catch (error) {
      await this.handleDispatchFailure(entry, error);
      return false;
    }
  }

  /**
   * Handle dispatch failure with retry logic
   */
  private async handleDispatchFailure(
    entry: IOutboxEntryDocument,
    error: unknown
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    entry.lastError = errorMessage;

    // Check if max retries exceeded
    if (entry.attempts >= entry.maxAttempts) {
      // Check if should mark as poison
      if (entry.attempts >= this.config.poisonMessageThreshold) {
        entry.status = 'poison';
        console.error(
          `🚨 Poison message detected: Event ${entry.eventId} failed ${entry.attempts} times`
        );
      } else {
        entry.status = 'failed';
      }
    } else {
      // Schedule retry with exponential backoff
      entry.status = 'failed';
      const backoff = this.config.retryBackoffMs * Math.pow(2, entry.attempts - 1);
      entry.nextRetryAt = new Date(Date.now() + backoff);
    }

    await entry.save();
  }

  /**
   * Get dispatcher stats
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    delivered: number;
    failed: number;
    poison: number;
  }> {
    const [pending, processing, delivered, failed, poison] = await Promise.all([
      OutboxEntryModel.countDocuments({ status: 'pending' }),
      OutboxEntryModel.countDocuments({ status: 'processing' }),
      OutboxEntryModel.countDocuments({ status: 'delivered' }),
      OutboxEntryModel.countDocuments({ status: 'failed' }),
      OutboxEntryModel.countDocuments({ status: 'poison' }),
    ]);

    return { pending, processing, delivered, failed, poison };
  }
}

// Singleton instance
let dispatcherInstance: OutboxDispatcher | null = null;

export function getOutboxDispatcher(config?: OutboxDispatcherConfig): OutboxDispatcher {
  if (!dispatcherInstance) {
    dispatcherInstance = new OutboxDispatcher(config);
  }
  return dispatcherInstance;
}

export function resetOutboxDispatcher(): void {
  if (dispatcherInstance) {
    dispatcherInstance.stop();
  }
  dispatcherInstance = null;
}
