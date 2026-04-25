import { JobQueue } from './queue';
import {
  ProviderSyncRefreshPayload,
  JourneyFeatureExtractionPayload,
  OutboxDispatchPayload,
} from './types';

export function registerPlaceholderJobs(queue: JobQueue): void {
  queue.register<ProviderSyncRefreshPayload>('provider_sync_refresh', async (_job) => {
    // TODO: trigger provider sync for _job.payload.userId / _job.payload.provider
  });

  queue.register<JourneyFeatureExtractionPayload>('journey_feature_extraction', async (_job) => {
    // TODO: extract features for _job.payload.journeyId
  });

  queue.register<OutboxDispatchPayload>('outbox_dispatch', async (_job) => {
    // TODO: dispatch outbox entry _job.payload.outboxId
  });
}
