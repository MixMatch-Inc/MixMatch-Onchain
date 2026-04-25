import { randomUUID } from 'crypto';
import {
  Job,
  JobMeta,
  JobStatus,
  RetryPolicy,
  DEFAULT_RETRY_POLICY,
  nextRetryDelay,
  isDeadLetter,
} from './types';

export type JobHandler<TPayload = unknown> = (job: Job<TPayload>) => Promise<void>;

export class JobQueue {
  private queue: Job[] = [];
  private handlers = new Map<string, JobHandler>();
  private policy: RetryPolicy;

  constructor(policy: RetryPolicy = DEFAULT_RETRY_POLICY) {
    this.policy = policy;
  }

  register<TPayload>(type: string, handler: JobHandler<TPayload>): void {
    this.handlers.set(type, handler as JobHandler);
  }

  enqueue<TPayload>(type: string, payload: TPayload, policy?: RetryPolicy): Job<TPayload> {
    const p = policy ?? this.policy;
    const job: Job<TPayload> = {
      id: randomUUID(),
      type,
      status: 'pending' as JobStatus,
      attempts: 0,
      maxAttempts: p.maxAttempts,
      nextRunAt: new Date(),
      payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.queue.push(job as Job);
    return job;
  }

  async processNext(): Promise<JobMeta | null> {
    const now = new Date();
    const job = this.queue.find(
      (j) => j.status === 'pending' && j.nextRunAt <= now,
    );
    if (!job) return null;

    const handler = this.handlers.get(job.type);
    job.status = 'running';
    job.attempts += 1;
    job.updatedAt = new Date();

    try {
      if (handler) await handler(job);
      job.status = 'done';
    } catch (err) {
      job.lastError = err instanceof Error ? err.message : String(err);
      if (isDeadLetter(job)) {
        job.status = 'dead';
      } else {
        job.status = 'pending';
        job.nextRunAt = new Date(
          Date.now() + nextRetryDelay(this.policy, job.attempts),
        );
      }
    }

    job.updatedAt = new Date();
    return job;
  }

  /** Run until queue is drained (useful in dev / tests). */
  async drain(): Promise<void> {
    let processed: JobMeta | null;
    do {
      processed = await this.processNext();
    } while (processed !== null);
  }

  pending(): Job[] {
    return this.queue.filter((j) => j.status === 'pending');
  }

  deadLetters(): Job[] {
    return this.queue.filter((j) => j.status === 'dead');
  }
}

// Singleton for in-process use
let _queue: JobQueue | undefined;
export function getJobQueue(): JobQueue {
  if (!_queue) _queue = new JobQueue();
  return _queue;
}
export function resetJobQueue(): void {
  _queue = undefined;
}
