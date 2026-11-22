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

export function getWalletAccount(accessToken: string): Promise<WalletResponse> {
  return request<Raw>('/payments/account', { headers: authHeaders(accessToken) }).then((row) => ({
    publicKey: str(row.public_key ?? row.publicKey),
    network: str(row.network ?? 'testnet'),
  }));
}

export function createWallet(accessToken: string): Promise<WalletResponse> {
  return request<Raw>('/payments/wallet', {
    method: 'POST',
    headers: authHeaders(accessToken),
  }).then((row) => ({
    publicKey: str(row.public_key ?? row.publicKey),
    network: str(row.network ?? 'testnet'),
    created: Boolean(row.created),
  }));
}

export function fundWallet(accessToken: string): Promise<FundWalletResponse> {
  return request<Raw>('/payments/wallet/fund', {
    method: 'POST',
    headers: authHeaders(accessToken),
  }).then((row) => ({
    publicKey: str(row.public_key ?? row.publicKey),
    funded: Boolean(row.funded),
    message: str(row.message),
  }));
}

export function getBalances(accessToken: string): Promise<BalancesResponse> {
  return request<Raw>('/payments/balances', { headers: authHeaders(accessToken) }).then((row) => ({
    publicKey: str(row.public_key ?? row.publicKey),
    network: str(row.network ?? 'testnet'),
    balances: ((row.balances as Raw[]) ?? []).map((item) => ({
      assetCode: str(item.asset_code ?? item.assetCode),
      assetIssuer: item.asset_issuer == null ? null : str(item.asset_issuer),
      balance: str(item.balance),
    })),
  }));
}

export function getProfile(accessToken: string): Promise<ProfileUpdateInput & { email: string }> {
  return request<Raw>('/users/me', { headers: authHeaders(accessToken) }).then((row) => ({
    displayName: str(row.display_name ?? row.displayName),
    bio: row.bio == null ? undefined : str(row.bio),
    avatarUrl: row.avatar_url == null ? null : str(row.avatar_url),
    email: str(row.email),
  }));
}

export function updateProfile(input: ProfileUpdateInput, accessToken: string): Promise<void> {
  return request('/users/me', {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      display_name: input.displayName,
      bio: input.bio ?? null,
      avatar_url: input.avatarUrl ?? null,
    }),
  });
}

export function uploadAvatar(data: string, contentType: string, accessToken: string): Promise<AvatarUploadResponse> {
  return request<Raw>('/users/me/avatar', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ content_type: contentType, data }),
  }).then((row) => ({ avatarUrl: str(row.avatar_url ?? row.avatarUrl) }));
}
