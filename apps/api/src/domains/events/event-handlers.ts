import { DomainEvent, JourneyPublishedPayload, DomainEventType } from './domain-events';
import { getEventBus } from './event-bus';
import { getJobQueue } from '../jobs/queue';

export function setupEventHandlers(): void {
  const eventBus = getEventBus();
  const jobQueue = getJobQueue();

  // Handle journey published events
  eventBus.subscribe('JOURNEY_PUBLISHED' as DomainEventType, async (event: DomainEvent<JourneyPublishedPayload>) => {
    const { journeyId, snapshotId, userId } = event.payload;

    // Enqueue feature extraction job
    jobQueue.enqueue('journey_feature_extraction', {
      journeyId,
      snapshotId,
      userId,
    });

    console.log(`Enqueued feature extraction job for journey ${journeyId}`);
  });
}