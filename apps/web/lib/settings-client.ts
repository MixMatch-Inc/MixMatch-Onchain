import type { LinkedAccount, SocialAuthResult, SocialProvider, UserSettings } from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

type Raw = Record<string, unknown>;

function normalize(row: Raw): UserSettings {
  const preferences = (row.notificationPreferences ?? row.notification_preferences ?? {}) as Raw;
  return {
    network: String(row.network ?? 'testnet') as UserSettings['network'],
    displayCurrency: String(row.displayCurrency ?? row.display_currency ?? 'USD'),
    language: String(row.language ?? 'en'),
    notificationPreferences: {
      payments: Boolean(preferences.payments ?? true),
      matches: Boolean(preferences.matches ?? true),
      marketing: Boolean(preferences.marketing ?? false),
    },
    biometricsEnabled: Boolean(row.biometricsEnabled ?? row.biometrics_enabled),
  };
}

export function getSettings(accessToken: string): Promise<UserSettings> {
  return request<Raw>('/settings', { headers: authHeaders(accessToken) }).then(normalize);
}

export function updateSettings(input: Partial<UserSettings>, accessToken: string): Promise<UserSettings> {
  return request<Raw>('/settings', {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  }).then(normalize);
}

export function listLinkedAccounts(accessToken: string): Promise<LinkedAccount[]> {
  return request<Raw[]>('/settings/linked-accounts', { headers: authHeaders(accessToken) }).then((rows) =>
    (rows ?? []).map((row) => ({
      id: String(row.id),
      provider: String(row.provider),
      label: String(row.label),
      lastSyncAt: row.lastSyncAt == null ? null : String(row.lastSyncAt),
      active: Boolean(row.active),
    })),
  );
}

export function disconnectLinkedAccount(id: string, accessToken: string): Promise<void> {
  return request<void>(`/settings/linked-accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
}

export function getSocialAuthUrl(provider: SocialProvider): Promise<{ url: string; state: string }> {
  return request<Raw>(`/auth/social/${provider}/url`).then((row) => ({
    url: String(row.url),
    state: String(row.state),
  }));
}

export function completeSocialLogin(
  provider: SocialProvider,
  code: string,
  state: string,
  accessToken?: string,
): Promise<SocialAuthResult> {
  return request<Raw>(`/auth/social/${provider}/callback`, {
    method: 'POST',
    headers: accessToken ? authHeaders(accessToken) : undefined,
    body: JSON.stringify({ code, state }),
  }).then((row) => ({
    accessToken: String(row.accessToken ?? row.access_token),
    user: row.user as SocialAuthResult['user'],
  }));
}

export const SOCIAL_REDIRECT_URI = process.env.NEXT_PUBLIC_SOCIAL_REDIRECT_URI ?? 'http://localhost:3000/social-callback';

export function getSpotifyAuthUrl(userId: string, redirectUri?: string): Promise<{ url: string; state: string }> {
  const q = new URLSearchParams({ user_id: userId });
  if (redirectUri) q.set('redirect_uri', redirectUri);
  return request<Raw>(`/streaming/spotify/authorize?${q.toString()}`).then((row) => ({
    url: String(row.url),
    state: String(row.state),
  }));
}

export function listStreamingConnections(userId: string): Promise<Raw[]> {
  return request<Raw>(`/streaming/connections?user_id=${encodeURIComponent(userId)}`).then((row) => (row.connections ?? []) as Raw[]);
}

export function disconnectStreamingConnection(id: string): Promise<void> {
  return request<void>(`/streaming/connections/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function completeSpotifyCallback(code: string, state: string): Promise<Raw> {
  return request<Raw>(`/streaming/spotify/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
}
