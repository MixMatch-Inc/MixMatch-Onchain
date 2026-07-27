import { describe, expect, it } from 'vitest';
import { InMemoryIdempotencyStore } from './idempotency.js';

describe('InMemoryIdempotencyStore', () => {
  it('returns undefined for a key that has never been set', () => {
    const store = new InMemoryIdempotencyStore<string>();
    expect(store.get('missing')).toBeUndefined();
  });

  it('returns the stored promise for a known key', async () => {
    const store = new InMemoryIdempotencyStore<string>();
    const promise = Promise.resolve('result');
    store.set('key-1', promise);

    expect(store.get('key-1')).toBe(promise);
    await expect(store.get('key-1')).resolves.toBe('result');
  });

  it('removes an entry on delete', () => {
    const store = new InMemoryIdempotencyStore<string>();
    store.set('key-1', Promise.resolve('result'));
    store.delete('key-1');

    expect(store.get('key-1')).toBeUndefined();
  });

  it('keeps entries for different keys independent', () => {
    const store = new InMemoryIdempotencyStore<string>();
    store.set('a', Promise.resolve('a-result'));
    store.set('b', Promise.resolve('b-result'));

    store.delete('a');

    expect(store.get('a')).toBeUndefined();
    expect(store.get('b')).toBeDefined();
  });
});
