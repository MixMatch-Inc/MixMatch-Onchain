import type {
  AvatarUploadResponse,
  BalancesResponse,
  FundWalletResponse,
  ProfileUpdateInput,
  WalletResponse,
} from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

type Raw = Record<string, unknown>;

const str = (value: unknown): string => (typeof value === 'string' ? value : String(value ?? ''));

export async function getWalletAccount(accessToken: string): Promise<WalletResponse> {
  const row = await request<Raw>('/payments/account', { headers: authHeaders(accessToken) });
  return { publicKey: str(row.public_key ?? row.publicKey), network: str(row.network ?? 'testnet') };
}

export async function createWallet(accessToken: string): Promise<WalletResponse> {
  const row = await request<Raw>('/payments/wallet', {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  return {
    publicKey: str(row.public_key ?? row.publicKey),
    network: str(row.network ?? 'testnet'),
    created: Boolean(row.created),
  };
}

export async function fundWallet(accessToken: string): Promise<FundWalletResponse> {
  const row = await request<Raw>('/payments/wallet/fund', {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  return {
    publicKey: str(row.public_key ?? row.publicKey),
    funded: Boolean(row.funded),
    message: str(row.message),
  };
}

export async function getBalances(accessToken: string): Promise<BalancesResponse> {
  const row = await request<Raw>('/payments/balances', { headers: authHeaders(accessToken) });
  return {
    publicKey: str(row.public_key ?? row.publicKey),
    network: str(row.network ?? 'testnet'),
    balances: ((row.balances as Raw[]) ?? []).map((item) => ({
      assetCode: str(item.asset_code ?? item.assetCode),
      assetIssuer: item.asset_issuer == null ? null : str(item.asset_issuer),
      balance: str(item.balance),
    })),
  };
}

export async function updateProfile(input: ProfileUpdateInput, accessToken: string): Promise<void> {
  await request('/users/me', {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      display_name: input.displayName,
      bio: input.bio ?? null,
      avatar_url: input.avatarUrl ?? null,
    }),
  });
}

export async function uploadAvatar(
  data: string,
  contentType: string,
  accessToken: string,
): Promise<AvatarUploadResponse> {
  const row = await request<Raw>('/users/me/avatar', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ content_type: contentType, data }),
  });
  return { avatarUrl: str(row.avatar_url ?? row.avatarUrl) };
}
