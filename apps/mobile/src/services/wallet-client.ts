import type {
  AssetListResponse,
  HandleLookupResponse,
  SavedContact,
  SavedContactInput,
  SavedContactsResponse,
  TransactionDetailResponse,
  TransactionRecord,
} from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

type Raw = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

function optional(value: unknown): string | null {
  return value === undefined || value === null ? null : String(value);
}

function toContact(row: Raw): SavedContact {
  return {
    id: str(row.id),
    label: str(row.label),
    destinationPublicKey: str(row.destination_public_key ?? row.destinationPublicKey),
    memo: optional(row.memo),
    createdAt: str(row.created_at ?? row.createdAt),
    updatedAt: str(row.updated_at ?? row.updatedAt),
  };
}

function toTransaction(row: Raw): TransactionRecord {
  return {
    id: str(row.id),
    idempotencyKey: str(row.idempotency_key ?? row.idempotencyKey),
    stellarAccountId: str(row.stellar_account_id ?? row.stellarAccountId),
    destinationPublicKey: str(row.destination_public_key ?? row.destinationPublicKey),
    amount: str(row.amount),
    memo: optional(row.memo),
    assetCode: optional(row.asset_code ?? row.assetCode),
    assetIssuer: optional(row.asset_issuer ?? row.assetIssuer),
    receiveAssetCode: optional(row.receive_asset_code ?? row.receiveAssetCode),
    receiveAssetIssuer: optional(row.receive_asset_issuer ?? row.receiveAssetIssuer),
    destAmount: optional(row.dest_amount ?? row.destAmount),
    status: str(row.status) as TransactionRecord['status'],
    stellarTxHash: optional(row.stellar_tx_hash ?? row.stellarTxHash),
    failureCode: optional(row.failure_code ?? row.failureCode),
    failureReason: optional(row.failure_reason ?? row.failureReason),
    createdAt: str(row.created_at ?? row.createdAt),
    updatedAt: str(row.updated_at ?? row.updatedAt),
  };
}

export async function getContacts(accessToken: string): Promise<SavedContactsResponse> {
  const body = await request<{ contacts: Raw[] }>('/contacts', { headers: authHeaders(accessToken) });
  return { contacts: (body.contacts ?? []).map(toContact) };
}

export async function createContact(input: SavedContactInput, accessToken: string): Promise<SavedContact> {
  const row = await request<Raw>('/contacts', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      label: input.label,
      destination_public_key: input.destinationPublicKey,
      memo: input.memo ?? null,
    }),
  });
  return toContact(row);
}

export function deleteContact(id: string, accessToken: string): Promise<void> {
  return request<void>(`/contacts/${id}`, { method: 'DELETE', headers: authHeaders(accessToken) });
}

export async function lookupHandle(handle: string, accessToken: string): Promise<HandleLookupResponse> {
  const row = await request<Raw>(`/users/lookup?handle=${encodeURIComponent(handle)}`, {
    headers: authHeaders(accessToken),
  });
  return {
    handle: str(row.handle),
    displayName: str(row.display_name ?? row.displayName),
    publicKey: str(row.public_key ?? row.publicKey),
    avatarUrl: optional(row.avatar_url ?? row.avatarUrl),
  };
}

export async function getAssets(accessToken: string): Promise<AssetListResponse> {
  const body = await request<{ assets: Raw[] }>('/payments/assets', { headers: authHeaders(accessToken) });
  return {
    assets: body.assets.map((row) => ({
      code: str(row.code),
      issuer: optional(row.issuer),
      name: optional(row.name) ?? undefined,
      trustlineEstablished: Boolean(row.trustline_established ?? row.trustlineEstablished),
    })),
  };
}

export function addTrustline(code: string, issuer: string, accessToken: string): Promise<void> {
  return request<void>('/payments/trustlines', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ asset_code: code, asset_issuer: issuer }),
  });
}

export async function getTransactionDetail(id: string, accessToken: string): Promise<TransactionDetailResponse> {
  const body = await request<Raw>(`/payments/${id}/detail`, { headers: authHeaders(accessToken) });
  return {
    transaction: toTransaction(body.transaction as Raw),
    timeline: ((body.timeline as Raw[]) ?? []).map((entry) => ({
      status: str(entry.status),
      label: str(entry.label),
      at: optional(entry.at),
      description: str(entry.description),
    })),
    explorerUrl: optional(body.explorer_url ?? body.explorerUrl),
  };
}
