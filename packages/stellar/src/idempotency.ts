/**
 * Idempotency store for payment submissions.
 *
 * `StellarPaymentService` uses this to dedupe concurrent/duplicate
 * submissions sharing the same idempotency key. `InMemoryIdempotencyStore`
 * is process-local: it's enough to prevent double-submission from retries or
 * concurrent calls within a single running service instance, but it does
 * **not** survive a process restart. If cross-process/durable idempotency is
 * required (e.g. across `apps/api` instances or after a crash mid-request),
 * pass a `IdempotencyStore` implementation backed by persistent storage
 * (e.g. a database table keyed by idempotency key) — that's an
 * application-level concern outside this package's scope.
 */
export interface IdempotencyStore<T> {
  get(key: string): Promise<T> | undefined;
  set(key: string, value: Promise<T>): void;
  delete(key: string): void;
}

export class InMemoryIdempotencyStore<T> implements IdempotencyStore<T> {
  private readonly entries = new Map<string, Promise<T>>();

  get(key: string): Promise<T> | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: Promise<T>): void {
    this.entries.set(key, value);
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}
