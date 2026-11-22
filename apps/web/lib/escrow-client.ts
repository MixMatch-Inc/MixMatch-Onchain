import { authHeaders, request } from './api-client';

export type EscrowState = 'PENDING' | 'LOCKED' | 'RELEASED' | 'REFUNDED' | 'FAILED' | 'DISPUTED';

export interface EscrowView {
  id: string;
  payeePublicKey: string;
  tokenContractId: string;
  amount: string;
  timeoutLedger: number | null;
  status: EscrowState;
  depositTxHash: string | null;
  finalizeTxHash: string | null;
  createdAt: string;
}

type Raw = Record<string, unknown>;

function pick<T>(row: Raw, snake: string, camel: string): T {
  return (row[snake] ?? row[camel]) as T;
}

export function toEscrowView(row: Raw): EscrowView {
  return {
    id: String(row.id),
    payeePublicKey: pick<string>(row, 'payee_public_key', 'payeePublicKey'),
    tokenContractId: pick<string>(row, 'token_contract_id', 'tokenContractId'),
    amount: String(row.amount),
    timeoutLedger: pick<number | null>(row, 'timeout_ledger', 'timeoutLedger') ?? null,
    status: row.status as EscrowState,
    depositTxHash: pick<string | null>(row, 'deposit_tx_hash', 'depositTxHash') ?? null,
    finalizeTxHash: pick<string | null>(row, 'finalize_tx_hash', 'finalizeTxHash') ?? null,
    createdAt: pick<string>(row, 'created_at', 'createdAt'),
  };
}

export interface CreateEscrowInput {
  payeePublicKey: string;
  tokenContractId: string;
  amount: string;
  timeoutLedger?: number;
  idempotencyKey: string;
}

/** The escrow API takes snake_case fields (`escrow_router.py`). */
export async function createEscrow(input: CreateEscrowInput, accessToken: string): Promise<EscrowView> {
  const row = await request<Raw>('/escrows', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      payee_public_key: input.payeePublicKey,
      token_contract_id: input.tokenContractId,
      amount: input.amount,
      timeout_ledger: input.timeoutLedger,
      idempotency_key: input.idempotencyKey,
    }),
  });
  return toEscrowView(row);
}

export async function getEscrow(id: string, accessToken: string): Promise<EscrowView> {
  return toEscrowView(await request<Raw>(`/escrows/${id}`, { headers: authHeaders(accessToken) }));
}

export async function releaseEscrow(id: string, accessToken: string): Promise<EscrowView> {
  return toEscrowView(await request<Raw>(`/escrows/${id}/release`, { method: 'POST', headers: authHeaders(accessToken) }));
}

export async function refundEscrow(id: string, accessToken: string): Promise<EscrowView> {
  return toEscrowView(await request<Raw>(`/escrows/${id}/refund`, { method: 'POST', headers: authHeaders(accessToken) }));
}

export async function openDispute(id: string, reason: string, accessToken: string): Promise<void> {
  await request<Raw>(`/escrows/${id}/dispute`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ reason }),
  });
}
