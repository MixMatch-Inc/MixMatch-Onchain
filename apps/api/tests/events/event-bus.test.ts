// Tests for event bus abstraction
import { test } from 'node:test';
import assert from 'node:assert';
import { EventBus, resetEventBus, getEventBus } from '../../src/domains/events/event-bus';
import { DomainEvent } from '../../src/domains/events/domain-events';

test('EventBus - should create and publish events', async () => {
  const eventBus = new EventBus();
  const receivedEvents: DomainEvent[] = [];

  // Subscribe to events
  eventBus.subscribe('*', (event) => {
    receivedEvents.push(event);
  });

  // Create and publish event
  const event = eventBus.createEvent(
    'JOURNEY_PUBLISHED' as any,
    { journeyId: '123', userId: 'user1', title: 'Test Journey', snapshotId: 'snap1' },
    { userId: 'user1' }
  );

  await eventBus.publish(event);

  assert.strictEqual(receivedEvents.length, 1);
  assert.strictEqual(receivedEvents[0].type, 'JOURNEY_PUBLISHED');
  assert.strictEqual(receivedEvents[0].userId, 'user1');
});

test('EventBus - should filter events by type', async () => {
  const eventBus = new EventBus();
  const journeyEvents: DomainEvent[] = [];
  const resonanceEvents: DomainEvent[] = [];

  eventBus.subscribe('JOURNEY_PUBLISHED', (event) => {
    journeyEvents.push(event);
  });

  eventBus.subscribe('RESONANCE_CREATED', (event) => {
    resonanceEvents.push(event);
  });

  const journeyEvent = eventBus.createEvent(
    'JOURNEY_PUBLISHED' as any,
    { journeyId: '123', userId: 'user1', title: 'Test', snapshotId: 'snap1' }
  );

  const resonanceEvent = eventBus.createEvent(
    'RESONANCE_CREATED' as any,
    { resonanceId: '456', userId: 'user1', journeyId: '123', score: 0.95 }
  );

  await eventBus.publish(journeyEvent);
  await eventBus.publish(resonanceEvent);

  assert.strictEqual(journeyEvents.length, 1);
  assert.strictEqual(resonanceEvents.length, 1);
});

test('EventBus - should maintain event ordering', async () => {
  const eventBus = new EventBus();
  const order: string[] = [];

  eventBus.subscribe('*', (event) => {
    order.push(event.type);
  });

  const event1 = eventBus.createEvent('JOURNEY_PUBLISHED' as any, {});
  const event2 = eventBus.createEvent('RESONANCE_CREATED' as any, {});
  const event3 = eventBus.createEvent('DISCOVERY_LIKED' as any, {});

  await eventBus.publish(event1);
  await eventBus.publish(event2);
  await eventBus.publish(event3);

  assert.deepStrictEqual(order, [
    'JOURNEY_PUBLISHED',
    'RESONANCE_CREATED',
    'DISCOVERY_LIKED',
  ]);
});

test('EventBus - should handle handler errors gracefully', async () => {
  const eventBus = new EventBus();
  let successHandlerCalled = false;

  eventBus.subscribe('JOURNEY_PUBLISHED', () => {
    throw new Error('Handler error');
  });

  eventBus.subscribe('JOURNEY_PUBLISHED', () => {
    successHandlerCalled = true;
  });

  const event = eventBus.createEvent('JOURNEY_PUBLISHED' as any, {});

  // Should not throw
  await eventBus.publish(event);
  assert.strictEqual(successHandlerCalled, true);
});

test('EventBus - should support unsubscribe', async () => {
  const eventBus = new EventBus();
  let callCount = 0;

  const subscriptionId = eventBus.subscribe('*', () => {
    callCount++;
  });

  const event = eventBus.createEvent('JOURNEY_PUBLISHED' as any, {});
  await eventBus.publish(event);
  assert.strictEqual(callCount, 1);

  eventBus.unsubscribe(subscriptionId);
  await eventBus.publish(event);
  assert.strictEqual(callCount, 1); // Should not increase
});

test('EventBus - should track event log', async () => {
  const eventBus = new EventBus();

  const event1 = eventBus.createEvent('JOURNEY_PUBLISHED' as any, {});
  const event2 = eventBus.createEvent('RESONANCE_CREATED' as any, {});

  await eventBus.publish(event1);
  await eventBus.publish(event2);

  const log = eventBus.getEventLog();
  assert.strictEqual(log.length, 2);
  assert.strictEqual(log[0].type, 'JOURNEY_PUBLISHED');
  assert.strictEqual(log[1].type, 'RESONANCE_CREATED');
});

test('EventBus - singleton instance', () => {
  resetEventBus();
  const instance1 = getEventBus();
  const instance2 = getEventBus();

  assert.strictEqual(instance1, instance2);
  resetEventBus();
});
