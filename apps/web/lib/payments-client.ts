import {
  parseTransactionEvent,
  splitSseFrames,
  type SendPaymentInput,
  type SendPaymentResponse,
  type StellarAccountResponse,
  type TransactionHistoryResponse,
  type TransactionRecord,
} from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export function sendPayment(input: SendPaymentInput, accessToken: string): Promise<SendPaymentResponse> {
  return request<SendPaymentResponse>('/payments/send', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function getStellarAccount(accessToken: string): Promise<StellarAccountResponse> {
  return request<StellarAccountResponse>('/payments/account', { headers: authHeaders(accessToken) });
}

export function getTransactionHistory(accessToken: string): Promise<TransactionHistoryResponse> {
  return request<TransactionHistoryResponse>('/payments/history', { headers: authHeaders(accessToken) });
}

export interface TransactionStreamHandle {
  close: () => void;
}

/**
 * Subscribes to `GET /payments/stream` (SSE) for live status updates, the web counterpart of the mobile
 * client. `EventSource` cannot send an Authorization header, so this reads the stream with `fetch` and
 * passes the token as `?token=` like mobile does. If the stream cannot be opened or drops, `onError` fires
 * once and the caller should fall back to polling history.
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
      const response = await fetch(`${API_URL}/payments/stream?token=${encodeURIComponent(accessToken)}`, {
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
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { frames, rest } = splitSseFrames(buffer);
        buffer = rest;
        for (const frame of frames) {
          const transaction = parseTransactionEvent(frame);
          if (transaction) onTransaction(transaction);
        }
      }
      if (!closed) onError?.(new Error('Transaction stream ended'));
    } catch (error) {
      if (!closed) onError?.(error);
    }
  })();

  return {
    close: () => {
      closed = true;
      controller.abort();
    },
  };
}
