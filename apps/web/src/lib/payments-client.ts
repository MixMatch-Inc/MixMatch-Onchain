import type {
  SendPaymentInput,
  SendPaymentResponse,
  TransactionHistoryResponse,
  TransactionStatusResponse,
} from '@mixmatch/shared';
import { request } from './api-client';

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function sendPayment(input: SendPaymentInput, accessToken: string): Promise<SendPaymentResponse> {
  return request<SendPaymentResponse>('/api/payments/send', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function getTransactionStatus(id: string, accessToken: string): Promise<TransactionStatusResponse> {
  return request<TransactionStatusResponse>(`/api/payments/${id}/status`, {
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

  return request<TransactionHistoryResponse>(`/api/payments/history${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(accessToken),
  });
}

export function reconcileTransaction(id: string, accessToken: string): Promise<TransactionStatusResponse> {
  return request<TransactionStatusResponse>(`/api/payments/${id}/reconcile`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}
