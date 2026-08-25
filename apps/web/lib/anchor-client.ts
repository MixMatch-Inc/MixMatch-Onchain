import type {
  AnchorTransactionHistoryResponse,
  AnchorTransactionStatusResponse,
  DepositAnchorInput,
  InitiateAnchorTransactionResponse,
  WithdrawAnchorInput,
} from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

export function depositAnchor(
  input: DepositAnchorInput,
  accessToken: string,
): Promise<InitiateAnchorTransactionResponse> {
  return request<InitiateAnchorTransactionResponse>('/anchor/deposit', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function withdrawAnchor(
  input: WithdrawAnchorInput,
  accessToken: string,
): Promise<InitiateAnchorTransactionResponse> {
  return request<InitiateAnchorTransactionResponse>('/anchor/withdraw', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function getAnchorStatus(id: string, accessToken: string): Promise<AnchorTransactionStatusResponse> {
  return request<AnchorTransactionStatusResponse>(`/anchor/${id}/status`, {
    headers: authHeaders(accessToken),
  });
}

export function getAnchorHistory(accessToken: string): Promise<AnchorTransactionHistoryResponse> {
  return request<AnchorTransactionHistoryResponse>('/anchor/history', {
    headers: authHeaders(accessToken),
  });
}
