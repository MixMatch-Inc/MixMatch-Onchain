import type {
  EstablishTrustlineInput,
  EstablishTrustlineResponse,
  PathQuoteInput,
  PathQuoteResponse,
  SendPaymentInput,
  SendPaymentResponse,
  StellarAccountResponse,
  TransactionHistoryResponse,
  TransactionRecord,
  TransactionStatusResponse,
} from '@mixmatch/shared';
import { API_URL, authHeaders, request } from './api-client';
import { createSseToken } from './auth-client';

export function sendPayment(input: SendPaymentInput, accessToken: string): Promise<SendPaymentResponse> {
  return request<SendPaymentResponse>('/payments/send', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function getStellarAccount(accessToken: string): Promise<StellarAccountResponse> {
  return request<StellarAccountResponse>('/payments/account', {
    headers: authHeaders(accessToken),
  });
}

export function getTransactionStatus(id: string, accessToken: string): Promise<TransactionStatusResponse> {
  return request<TransactionStatusResponse>(`/payments/${id}/status`, {
    headers: authHeaders(accessToken),
  });
}

export interface TransactionHistoryParams {
  page?: number;
  limit?: number;
}

export function getTransactionHistory(
  params: TransactionHistoryParams,
  accessToken: string,
): Promise<TransactionHistoryResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();

  return request<TransactionHistoryResponse>(`/payments/history${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(accessToken),
  });
}

export function reconcileTransaction(id: string, accessToken: string): Promise<TransactionStatusResponse> {
  return request<TransactionStatusResponse>(`/payments/${id}/reconcile`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}

export function establishTrustline(
  input: EstablishTrustlineInput,
  accessToken: string,
): Promise<EstablishTrustlineResponse> {
  return request<EstablishTrustlineResponse>('/payments/trustlines', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function quotePath(input: PathQuoteInput, accessToken: string): Promise<PathQuoteResponse> {
  return request<PathQuoteResponse>('/payments/quote', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export interface TransactionStreamHandle {
  close: () => void;
}

/**
 * Subscribes to `GET /payments/stream` (Server-Sent Events) for real-time
 * transaction status updates, instead of polling `getTransactionStatus`.
 *
 * `fetch`/`EventSource` can't attach a custom Authorization header to an SSE
 * request, so the stream authenticates via `?token=`. That token is NOT the
 * access token: a short-lived single-use one is minted first via
 * `POST /auth/sse-token`, so nothing durable ends up in a URL that proxies
 * and access logs will record. A fresh token is minted per connection,
 * including on reconnect, since each is accepted only once.
 *
 * Requires the runtime's `fetch` to support streaming response bodies
 * (`response.body` as a `ReadableStream`) — true on recent Hermes/React
 * Native, but not guaranteed on every device. If the stream can't be
 * opened or drops permanently, `onError` fires; callers should fall back
 * to polling `getTransactionStatus`/`getTransactionHistory` in that case
 * rather than assume the stream will recover on its own.
 */
export function subscribeToTransactionStream(
  accessToken: string,
  onTransaction: (transaction: TransactionRecord) => void,
  onError?: (error: unknown) => void,
): TransactionStreamHandle {
  const controller = new AbortController();
  let closed = false;

  void (async () => {
    try {
      const { token: streamToken } = await createSseToken(accessToken);
      const response = await fetch(`${API_URL}/payments/stream?token=${encodeURIComponent(streamToken)}`, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Transaction stream request failed: HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
          if (dataLine) {
            const payload = JSON.parse(dataLine.slice('data:'.length).trim()) as {
              transaction: TransactionRecord;
            };
            onTransaction(payload.transaction);
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (error) {
      if (!closed) {
        onError?.(error);
      }
    }
  })();

  return {
    close: () => {
      closed = true;
      controller.abort();
    },
  };
}
