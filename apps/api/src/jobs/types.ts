export type JobStatus = 'pending' | 'running' | 'done' | 'failed' | 'dead';

export interface JobMeta {
  id: string;
  type: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  nextRunAt: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job<TPayload = unknown> extends JobMeta {
  payload: TPayload;
}

// Placeholder job types
export type ProviderSyncRefreshPayload = { userId: string; provider: string };
export type JourneyFeatureExtractionPayload = { journeyId: string };
export type OutboxDispatchPayload = { outboxId: string };

export type KnownJobType =
  | 'provider_sync_refresh'
  | 'journey_feature_extraction'
  | 'outbox_dispatch';

export interface RetryPolicy {
  maxAttempts: number;
  /** Base delay in ms; actual delay = baseDelayMs * 2^(attempt-1) */
  baseDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
};

export function nextRetryDelay(policy: RetryPolicy, attempt: number): number {
  return policy.baseDelayMs * Math.pow(2, attempt - 1);
}

export function isDeadLetter(job: JobMeta): boolean {
  return job.attempts >= job.maxAttempts;
}
