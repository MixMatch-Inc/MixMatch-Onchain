import { describe, expect, it } from 'vitest';
import { parseTransactionEvent, splitSseFrames } from '../stream.js';

describe('parseTransactionEvent', () => {
  it('reads the transaction envelope', () => {
    const tx = parseTransactionEvent('data: {"transaction":{"id":"t1"}}');
    expect(tx?.id).toBe('t1');
  });
  it('reads the data envelope', () => {
    expect(parseTransactionEvent('data: {"data":{"id":"t2"}}')?.id).toBe('t2');
  });
  it('ignores heartbeats, empty and malformed frames', () => {
    expect(parseTransactionEvent('data: {"event_type":"heartbeat"}')).toBeNull();
    expect(parseTransactionEvent(': comment')).toBeNull();
    expect(parseTransactionEvent('data: {nope')).toBeNull();
  });
});

describe('splitSseFrames', () => {
  it('keeps the unfinished tail', () => {
    expect(splitSseFrames('data: a\n\ndata: b\n\ndata: c')).toEqual({ frames: ['data: a', 'data: b'], rest: 'data: c' });
  });
});
