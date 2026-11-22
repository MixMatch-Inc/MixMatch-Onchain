import type { LinkedAccount, SocialAuthResult, SocialProvider, UserSettings } from '@mixmatch/shared';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { authHeaders, request } from './api-client';

type Raw = Record<string, unknown>;

export const SOCIAL_REDIRECT_URI =
  process.env.EXPO_PUBLIC_SOCIAL_REDIRECT_URI ?? 'mixmatch://social-callback';

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

export async function startSocialLogin(provider: SocialProvider, accessToken?: string): Promise<SocialAuthResult> {
  if (Platform.OS === 'web') {
    WebBrowser.maybeCompleteAuthSession();
  }
  const { url, state } = await request<Raw>(
    `/auth/social/${provider}/url?redirect_uri=${encodeURIComponent(SOCIAL_REDIRECT_URI)}`,
  ).then((row) => ({ url: String(row.url), state: String(row.state) }));

  const result = await WebBrowser.openAuthSessionAsync(url, SOCIAL_REDIRECT_URI, {
    preferEphemeralSession: true,
  });
  if (result.type !== 'success') {
    throw new Error('Social sign in was cancelled.');
  }

  const params = new URLSearchParams(result.url.split('?')[1] ?? '');
  const code = params.get('code');
  const returnedState = params.get('state');
  if (!code || returnedState !== state) {
    throw new Error('Invalid social sign in response.');
  }
  return completeSocialLogin(provider, code, state, accessToken);
}
