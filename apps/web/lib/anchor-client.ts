import type {
  AnchorOperation,
  AnchorRateResponse,
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

/** `GET /anchor/rates`: the anchor's fee for an asset, so the user sees it before the interactive flow. */
export async function getAnchorRates(
  params: { assetCode: string; operation: AnchorOperation; amount?: string },
  accessToken: string,
): Promise<AnchorRateResponse> {
  const query = new URLSearchParams({ asset_code: params.assetCode, operation: params.operation });
  if (params.amount) query.set('amount', params.amount);
  const raw = await request<Record<string, string | boolean | null>>(`/anchor/rates?${query.toString()}`, {
    headers: authHeaders(accessToken),
  });
  const pick = (snake: string, camel: string) => (raw[snake] ?? raw[camel] ?? null) as string | null;
  return {
    assetCode: String(pick('asset_code', 'assetCode') ?? params.assetCode),
    operation: params.operation,
    enabled: raw.enabled !== false,
    feeTotal: pick('fee_total', 'feeTotal'),
    feeFixed: pick('fee_fixed', 'feeFixed'),
    feePercent: pick('fee_percent', 'feePercent'),
    minAmount: pick('min_amount', 'minAmount'),
    maxAmount: pick('max_amount', 'maxAmount'),
  };
}
