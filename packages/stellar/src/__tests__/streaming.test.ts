import { afterEach, describe, expect, it, vi } from 'vitest';
import { streamAccountPayments } from '../streaming.js';
import type { DefaultStellarClient } from '../client.js';

interface FakeStreamOptions {
  onmessage: (raw: unknown) => void;
  onerror: (error: unknown) => void;
}

function fakeStreamingClient() {
  const closeMocks: Array<ReturnType<typeof vi.fn>> = [];
  const capturedOptions: FakeStreamOptions[] = [];
  const cursorCalls: string[] = [];
  const forAccountMock = vi.fn();

  const client = {
    horizon: {
      payments: vi.fn().mockReturnValue({ forAccount: forAccountMock }),
    },
  } as unknown as DefaultStellarClient;

  forAccountMock.mockImplementation(() => {
    const builder = {
      order: vi.fn().mockReturnThis(),
      cursor: vi.fn((token: string) => {
        cursorCalls.push(token);
        return builder;
      }),
      stream: vi.fn((options: FakeStreamOptions) => {
        capturedOptions.push(options);
        const closeMock = vi.fn();
        closeMocks.push(closeMock);
        return closeMock;
      }),
    };
    return builder;
  });

  return { client, capturedOptions, closeMocks, cursorCalls };
}

describe('streamAccountPayments', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a live stream (no cursor) when none is provided', () => {
    const { client, cursorCalls } = fakeStreamingClient();

    const handle = streamAccountPayments({
      client,
      accountPublicKey: 'GACCOUNT',
      onEvent: () => {},
    });

    expect(cursorCalls).toEqual([]);
    handle.close();
  });

  it('starts from the provided cursor', () => {
    const { client, cursorCalls } = fakeStreamingClient();

    const handle = streamAccountPayments({
      client,
      accountPublicKey: 'GACCOUNT',
      cursor: 'existing-cursor',
      onEvent: () => {},
    });

    expect(cursorCalls).toEqual(['existing-cursor']);
    handle.close();
  });

  it('normalizes an incoming raw Horizon record to camelCase and forwards it to onEvent', () => {
    const { client, capturedOptions } = fakeStreamingClient();
    const onEvent = vi.fn();

    const handle = streamAccountPayments({ client, accountPublicKey: 'GACCOUNT', onEvent });

    capturedOptions[0]?.onmessage({
      id: 'event-1',
      paging_token: 'token-1',
      type: 'payment',
      to: 'GDEST',
      from: 'GSOURCE',
      amount: '10.0000000',
      asset_type: 'native',
      transaction_hash: 'hash-1',
      created_at: '2026-01-01T00:00:00Z',
    });

    expect(onEvent).toHaveBeenCalledWith({
      id: 'event-1',
      pagingToken: 'token-1',
      type: 'payment',
      to: 'GDEST',
      from: 'GSOURCE',
      amount: '10.0000000',
      assetType: 'native',
      assetCode: undefined,
      assetIssuer: undefined,
      transactionHash: 'hash-1',
      createdAt: '2026-01-01T00:00:00Z',
    });
    handle.close();
  });

  it('on error, reconnects from the paging token of the last event actually delivered, not from "now"', () => {
    vi.useFakeTimers();
    const { client, capturedOptions, cursorCalls } = fakeStreamingClient();
    const onEvent = vi.fn();
    const onError = vi.fn();

    const handle = streamAccountPayments({
      client,
      accountPublicKey: 'GACCOUNT',
      onEvent,
      onError,
      reconnectDelayMs: 1000,
    });

    // First connection delivers one event, then errors (connection dropped).
    capturedOptions[0]?.onmessage({
      id: 'event-1',
      paging_token: 'token-1',
      type: 'payment',
      transaction_hash: 'hash-1',
      created_at: '2026-01-01T00:00:00Z',
    });
    capturedOptions[0]?.onerror(new Event('error'));

    expect(onError).toHaveBeenCalledTimes(1);
    // Not yet reconnected — still waiting out reconnectDelayMs.
    expect(cursorCalls).toEqual([]);

    vi.advanceTimersByTime(1000);

    // Reconnected using the paging token of the last delivered event, so
    // nothing that landed during the gap is silently skipped.
    expect(cursorCalls).toEqual(['token-1']);
    expect(capturedOptions).toHaveLength(2);

    handle.close();
  });

  it('keeps advancing the reconnect cursor across multiple delivered events before a drop', () => {
    vi.useFakeTimers();
    const { client, capturedOptions, cursorCalls } = fakeStreamingClient();

    const handle = streamAccountPayments({
      client,
      accountPublicKey: 'GACCOUNT',
      onEvent: () => {},
      reconnectDelayMs: 500,
    });

    capturedOptions[0]?.onmessage({
      id: 'event-1',
      paging_token: 'token-1',
      type: 'payment',
      transaction_hash: 'hash-1',
      created_at: '2026-01-01T00:00:00Z',
    });
    capturedOptions[0]?.onmessage({
      id: 'event-2',
      paging_token: 'token-2',
      type: 'payment',
      transaction_hash: 'hash-2',
      created_at: '2026-01-01T00:00:01Z',
    });
    capturedOptions[0]?.onerror(new Event('error'));
    vi.advanceTimersByTime(500);

    expect(cursorCalls).toEqual(['token-2']);
    handle.close();
  });

  it('stops reconnecting once closed, even if a reconnect was already scheduled', () => {
    vi.useFakeTimers();
    const { client, capturedOptions, closeMocks } = fakeStreamingClient();

    const handle = streamAccountPayments({
      client,
      accountPublicKey: 'GACCOUNT',
      onEvent: () => {},
      reconnectDelayMs: 500,
    });

    capturedOptions[0]?.onerror(new Event('error'));
    handle.close();
    vi.advanceTimersByTime(500);

    expect(capturedOptions).toHaveLength(1);
    expect(closeMocks[0]).toHaveBeenCalled();
  });
});
