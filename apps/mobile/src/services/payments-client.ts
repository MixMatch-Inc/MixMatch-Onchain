import type {
  SendPaymentInput,
  SendPaymentResponse,
  StellarAccountResponse,
  TransactionHistoryResponse,
  TransactionStatusResponse,
} from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

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
