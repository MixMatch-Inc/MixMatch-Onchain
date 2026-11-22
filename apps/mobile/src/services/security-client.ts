import type { ChangePasswordInput, ForgotPasswordInput, NotificationPreferences, ResetPasswordInput } from '@mixmatch/shared';
import { API_URL, authHeaders, request } from './api-client';

type Raw = Record<string, unknown>;
const message = (row: Raw) => String(row.message ?? '');

export function forgotPassword(input: ForgotPasswordInput): Promise<string> {
  return request<Raw>('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email: input.email }),
  }).then(message);
}

export function resetPassword(input: ResetPasswordInput): Promise<string> {
  return request<Raw>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token: input.token, new_password: input.newPassword }),
  }).then(message);
}

export function changePassword(input: ChangePasswordInput, accessToken: string): Promise<string> {
  return request<Raw>('/auth/password/change', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ current_password: input.currentPassword, new_password: input.newPassword }),
  }).then(message);
}

export function sendVerificationEmail(accessToken: string): Promise<string> {
  return request<Raw>('/auth/email/send-verification', {
    method: 'POST',
    headers: authHeaders(accessToken),
  }).then(message);
}

export function registerDeviceToken(token: string, accessToken: string, platform: string): Promise<void> {
  return request('/notifications/device-tokens', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ token, platform }),
  });
}

export function getNotificationPreferences(accessToken: string): Promise<NotificationPreferences> {
  return request<Raw>('/notifications/preferences', { headers: authHeaders(accessToken) }).then((row) => ({
    payments: Boolean(row.payments),
    matches: Boolean(row.matches),
    marketing: Boolean(row.marketing),
  }));
}

export function updateNotificationPreferences(
  input: NotificationPreferences,
  accessToken: string,
): Promise<NotificationPreferences> {
  return request<Raw>('/notifications/preferences', {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  }).then((row) => ({
    payments: Boolean(row.payments),
    matches: Boolean(row.matches),
    marketing: Boolean(row.marketing),
  }));
}

export interface ExportResult {
  fileName: string;
  content: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return binary;
}

export async function exportTransactions(format: 'csv' | 'pdf', accessToken: string): Promise<ExportResult> {
  const response = await fetch(`${API_URL}/payments/export?format=${format}`, {
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error('Could not export transactions');
  const content = format === 'csv' ? await response.text() : toBase64(new Uint8Array(await response.arrayBuffer()));
  return { fileName: `mixmatch-transactions.${format}`, content };
}
