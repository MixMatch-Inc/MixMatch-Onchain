import { authHeaders, request } from './api-client';

/** A held (PENDING_SIGNATURE) payment as returned by the admin API (snake_case) or a camelCase proxy. */
export interface HeldPayment {
  id: string;
  amount: string;
  destinationPublicKey: string;
  memo: string | null;
  assetCode: string | null;
  createdAt: string;
  status: string;
}

type Raw = Record<string, unknown>;

function pick<T>(row: Raw, snake: string, camel: string): T {
  return (row[snake] ?? row[camel]) as T;
}

export function toHeldPayment(row: Raw): HeldPayment {
  return {
    id: String(row.id),
    amount: String(row.amount),
    destinationPublicKey: pick<string>(row, 'destination_public_key', 'destinationPublicKey'),
    memo: pick<string | null>(row, 'memo', 'memo') ?? null,
    assetCode: pick<string | null>(row, 'asset_code', 'assetCode') ?? null,
    createdAt: pick<string>(row, 'created_at', 'createdAt'),
    status: String(row.status),
  };
}

export async function listHeldPayments(accessToken: string): Promise<HeldPayment[]> {
  const rows = await request<Raw[]>('/admin/transactions/pending-signature', { headers: authHeaders(accessToken) });
  return rows.map(toHeldPayment);
}

export type Decision = 'approve' | 'reject';

/** The Idempotency-Key makes a double click or a retry safe: the server returns the first result. */
export function decideHeldPayment(id: string, decision: Decision, accessToken: string, idempotencyKey: string) {
  return request<Raw>(`/admin/transactions/${id}/${decision}`, {
    method: 'POST',
    headers: { ...authHeaders(accessToken), 'Idempotency-Key': idempotencyKey },
  });
}
