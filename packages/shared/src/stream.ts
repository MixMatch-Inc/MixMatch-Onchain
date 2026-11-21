import type { TransactionRecord } from './types/payments.js';

/**
 * Parses one raw Server-Sent-Events frame from `GET /payments/stream` into a transaction, or `null` for
 * heartbeats, frames without data and malformed JSON. Accepts both the `transaction` and `data` envelopes.
 */
export function parseTransactionEvent(rawEvent: string): TransactionRecord | null {
  const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
  if (!dataLine) return null;
  try {
    const payload = JSON.parse(dataLine.slice('data:'.length).trim()) as {
      event_type?: string;
      transaction?: TransactionRecord;
      data?: TransactionRecord;
    };
    if (payload.event_type === 'heartbeat' || payload.event_type === 'ping') return null;
    return payload.transaction ?? payload.data ?? null;
  } catch {
    return null;
  }
}

/** Splits an accumulating buffer into complete frames and the unfinished remainder. */
export function splitSseFrames(buffer: string): { frames: string[]; rest: string } {
  const frames: string[] = [];
  let rest = buffer;
  let boundary = rest.indexOf('\n\n');
  while (boundary !== -1) {
    frames.push(rest.slice(0, boundary));
    rest = rest.slice(boundary + 2);
    boundary = rest.indexOf('\n\n');
  }
  return { frames, rest };
}
