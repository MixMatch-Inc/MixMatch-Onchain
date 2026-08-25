import type { DefaultStellarClient } from './client.js';

export interface PaymentStreamEvent {
  id: string;
  /** Horizon's paging token for this event — pass as `cursor` to resume a stream from just after it. */
  pagingToken: string;
  type: string;
  to?: string;
  from?: string;
  amount?: string;
  assetType?: string;
  assetCode?: string;
  assetIssuer?: string;
  transactionHash: string;
  createdAt: string;
}

interface RawPaymentRecord {
  id: string;
  paging_token: string;
  type: string;
  to?: string;
  from?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  transaction_hash: string;
  created_at: string;
}

function toPaymentStreamEvent(raw: RawPaymentRecord): PaymentStreamEvent {
  return {
    id: raw.id,
    pagingToken: raw.paging_token,
    type: raw.type,
    to: raw.to,
    from: raw.from,
    amount: raw.amount,
    assetType: raw.asset_type,
    assetCode: raw.asset_code,
    assetIssuer: raw.asset_issuer,
    transactionHash: raw.transaction_hash,
    createdAt: raw.created_at,
  };
}

export interface StreamAccountPaymentsParams {
  client: DefaultStellarClient;
  accountPublicKey: string;
  /**
   * Resume from just after this paging token instead of starting live —
   * pass the `pagingToken` of the last event you actually processed (e.g.
   * from a client's `Last-Event-ID`) so a reconnect never silently misses
   * events that landed during the gap.
   */
  cursor?: string;
  onEvent: (event: PaymentStreamEvent) => void;
  onError?: (error: unknown) => void;
  /** Delay before reconnecting after a stream error, in ms. Defaults to 5000. */
  reconnectDelayMs?: number;
}

export interface PaymentStreamHandle {
  /** Stops the stream and cancels any pending reconnect. */
  close: () => void;
}

/**
 * Wraps Horizon's SSE payment stream for one account with automatic,
 * cursor-based reconnection: on a stream error, it reconnects starting
 * just after the last event actually delivered to `onEvent`, rather than
 * from "now" — so a dropped connection never silently drops events that
 * landed during the gap.
 */
export function streamAccountPayments(params: StreamAccountPaymentsParams): PaymentStreamHandle {
  let closed = false;
  let lastPagingToken = params.cursor;
  let closeCurrentStream: (() => void) | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  function connect(): void {
    if (closed) {
      return;
    }

    let callBuilder = params.client.horizon.payments().forAccount(params.accountPublicKey).order('asc');
    if (lastPagingToken) {
      callBuilder = callBuilder.cursor(lastPagingToken);
    }

    closeCurrentStream = callBuilder.stream({
      onmessage: (raw: unknown) => {
        const event = toPaymentStreamEvent(raw as RawPaymentRecord);
        lastPagingToken = event.pagingToken;
        params.onEvent(event);
      },
      onerror: (error: unknown) => {
        params.onError?.(error);
        closeCurrentStream?.();
        if (!closed) {
          reconnectTimer = setTimeout(connect, params.reconnectDelayMs ?? 5000);
        }
      },
    });
  }

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      closeCurrentStream?.();
    },
  };
}
