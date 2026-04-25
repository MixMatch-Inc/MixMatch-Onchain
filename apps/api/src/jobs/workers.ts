import { JobQueue } from './queue';
import {
  ProviderSyncRefreshPayload,
  JourneyFeatureExtractionPayload,
  OutboxDispatchPayload,
} from './types';
import JourneySnapshot from '../domains/journeys/journey-snapshot.model';
import TrackReference from '../domains/journeys/track-reference.model';
import { storePlaceholderVector } from '../domains/recommendations/feature-vector.model';

export function registerPlaceholderJobs(queue: JobQueue): void {
  queue.register<ProviderSyncRefreshPayload>('provider_sync_refresh', async (_job) => {
    // TODO: trigger provider sync for _job.payload.userId / _job.payload.provider
  });

  queue.register<JourneyFeatureExtractionPayload>('journey_feature_extraction', async (job) => {
    const { journeyId, snapshotId, userId } = job.payload;

    // Load the journey snapshot
    const snapshot = await JourneySnapshot.findById(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    // Load track references for each slot
    const trackRefs = await Promise.all(
      snapshot.slots.map(slot => TrackReference.findById(slot.trackRef))
    );

    // Filter out any missing tracks
    const validTracks = trackRefs.filter(track => track !== null);

    // For now, create a single placeholder feature vector for the journey
    // In a real implementation, this would aggregate features from all tracks
    await storePlaceholderVector(userId, journeyId);

    console.log(`Extracted features for journey ${journeyId} with ${validTracks.length} tracks`);
  });

  queue.register<OutboxDispatchPayload>('outbox_dispatch', async (_job) => {
    // TODO: dispatch outbox entry _job.payload.outboxId
  });
}
