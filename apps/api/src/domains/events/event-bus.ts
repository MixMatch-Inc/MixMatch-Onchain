// Internal event bus abstraction for domain events
// Provides publish/subscribe pattern usable in-process now and queue-backed later

import { DomainEvent, DomainEventType } from './domain-events';
import { v4 as uuidv4 } from 'uuid';

type EventHandler<TPayload = unknown> = (event: DomainEvent<TPayload>) => Promise<void> | void;

interface EventSubscription {
  id: string;
  eventType: DomainEventType | '*';
  handler: EventHandler;
}

export class EventBus {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventLog: DomainEvent[] = [];
  private maxLogSize = 1000;

  /**
   * Subscribe to domain events
   * @param eventType - Event type to subscribe to, or '*' for all events
   * @param handler - Event handler function
   * @returns Subscription ID for unsubscribing
   */
  subscribe<TPayload = unknown>(
    eventType: DomainEventType | '*',
    handler: EventHandler<TPayload>
  ): string {
    const subscriptionId = uuidv4();
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      eventType,
      handler: handler as EventHandler,
    });
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   * @param subscriptionId - Subscription ID returned from subscribe
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Publish a domain event to all matching subscribers
   * @param event - Domain event to publish
   */
  async publish<TPayload = unknown>(event: DomainEvent<TPayload>): Promise<void> {
    // Log event for ordering verification
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    // Collect all matching handlers
    const matchingHandlers: EventHandler[] = [];
    for (const subscription of this.subscriptions.values()) {
      if (subscription.eventType === '*' || subscription.eventType === event.type) {
        matchingHandlers.push(subscription.handler);
      }
    }

    // Execute handlers sequentially to maintain ordering
    for (const handler of matchingHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(
          `Event handler error for event type ${event.type}:`,
          error instanceof Error ? error.message : error
        );
        // Continue executing other handlers even if one fails
      }
    }
  }

  /**
   * Create a domain event with metadata
   */
  createEvent<TPayload = unknown>(
    type: DomainEventType,
    payload: TPayload,
    options?: {
      userId?: string;
      correlationId?: string;
      metadata?: Record<string, unknown>;
    }
  ): DomainEvent<TPayload> {
    return {
      id: uuidv4(),
      type,
      payload,
      timestamp: new Date(),
      correlationId: options?.correlationId || uuidv4(),
      userId: options?.userId,
      metadata: options?.metadata,
    };
  }

  /**
   * Get event log for testing/verification
   */
  getEventLog(): ReadonlyArray<DomainEvent> {
    return [...this.eventLog];
  }

  /**
   * Clear event log (for testing)
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Clear all subscriptions (for testing)
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
  }
}

// Singleton instance for in-process event bus
let eventBusInstance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}

export function resetEventBus(): void {
  if (eventBusInstance) {
    eventBusInstance.clearSubscriptions();
    eventBusInstance.clearEventLog();
  }
  eventBusInstance = null;
}
