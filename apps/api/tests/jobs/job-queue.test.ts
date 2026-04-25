import { test } from 'node:test';
import assert from 'node:assert';
import { JobQueue, resetJobQueue, getJobQueue } from '../../src/jobs/queue';
import { DEFAULT_RETRY_POLICY, nextRetryDelay, isDeadLetter } from '../../src/jobs/types';

test('enqueue creates a pending job with correct metadata', () => {
  const q = new JobQueue();
  const job = q.enqueue('test_job', { x: 1 });
  assert.strictEqual(job.type, 'test_job');
  assert.strictEqual(job.status, 'pending');
  assert.strictEqual(job.attempts, 0);
  assert.strictEqual(job.maxAttempts, DEFAULT_RETRY_POLICY.maxAttempts);
  assert.deepStrictEqual(job.payload, { x: 1 });
});

test('processNext runs handler and marks job done', async () => {
  const q = new JobQueue();
  let ran = false;
  q.register('test_job', async () => { ran = true; });
  q.enqueue('test_job', {});
  await q.processNext();
  assert.ok(ran);
  assert.strictEqual(q.pending().length, 0);
});

test('failed job increments attempts and re-queues as pending', async () => {
  const q = new JobQueue({ maxAttempts: 3, baseDelayMs: 0 });
  q.register('fail_job', async () => { throw new Error('boom'); });
  q.enqueue('fail_job', {});
  const result = await q.processNext();
  assert.ok(result);
  assert.strictEqual(result.attempts, 1);
  assert.strictEqual(result.status, 'pending');
  assert.strictEqual(result.lastError, 'boom');
});

test('job becomes dead-letter after maxAttempts exhausted', async () => {
  const q = new JobQueue({ maxAttempts: 2, baseDelayMs: 0 });
  q.register('fail_job', async () => { throw new Error('fail'); });
  q.enqueue('fail_job', {});
  await q.processNext(); // attempt 1 → pending
  await q.processNext(); // attempt 2 → dead
  assert.strictEqual(q.deadLetters().length, 1);
  assert.strictEqual(q.deadLetters()[0].status, 'dead');
});

test('nextRetryDelay applies exponential backoff', () => {
  const policy = { maxAttempts: 5, baseDelayMs: 1000 };
  assert.strictEqual(nextRetryDelay(policy, 1), 1000);
  assert.strictEqual(nextRetryDelay(policy, 2), 2000);
  assert.strictEqual(nextRetryDelay(policy, 3), 4000);
});

test('isDeadLetter returns true when attempts >= maxAttempts', () => {
  const job = { attempts: 3, maxAttempts: 3 } as any;
  assert.ok(isDeadLetter(job));
  job.attempts = 2;
  assert.ok(!isDeadLetter(job));
});

test('getJobQueue returns singleton; resetJobQueue clears it', () => {
  resetJobQueue();
  const a = getJobQueue();
  const b = getJobQueue();
  assert.strictEqual(a, b);
  resetJobQueue();
  const c = getJobQueue();
  assert.notStrictEqual(a, c);
  resetJobQueue();
});

test('drain processes all pending jobs', async () => {
  const q = new JobQueue({ maxAttempts: 1, baseDelayMs: 0 });
  let count = 0;
  q.register('count_job', async () => { count++; });
  q.enqueue('count_job', {});
  q.enqueue('count_job', {});
  q.enqueue('count_job', {});
  await q.drain();
  assert.strictEqual(count, 3);
  assert.strictEqual(q.pending().length, 0);
});
