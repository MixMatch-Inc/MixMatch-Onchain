import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  NotificationPreferences,
  ResetPasswordInput,
} from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

type Raw = Record<string, unknown>;

export function forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
  return request<Raw>('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email: input.email }),
  }).then((row) => ({ message: String(row.message ?? '') }));
}

export function resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
  return request<Raw>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token: input.token, new_password: input.newPassword }),
  }).then((row) => ({ message: String(row.message ?? '') }));
}

export function changePassword(input: ChangePasswordInput, accessToken: string): Promise<{ message: string }> {
  return request<Raw>('/auth/password/change', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ current_password: input.currentPassword, new_password: input.newPassword }),
  }).then((row) => ({ message: String(row.message ?? '') }));
}

export function sendVerificationEmail(accessToken: string): Promise<{ message: string }> {
  return request<Raw>('/auth/email/send-verification', {
    method: 'POST',
    headers: authHeaders(accessToken),
  }).then((row) => ({ message: String(row.message ?? '') }));
}

export function getEmailVerified(accessToken: string): Promise<boolean> {
  return request<Raw>('/users/me', { headers: authHeaders(accessToken) }).then((row) =>
    Boolean(row.email_verified_at ?? row.emailVerifiedAt),
  );
}

export function verifyEmail(token: string): Promise<{ message: string }> {
  return request<Raw>('/auth/email/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }).then((row) => ({ message: String(row.message ?? '') }));
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

export async function downloadExport(format: 'csv' | 'pdf', accessToken: string): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/payments/export?format=${format}`,
    { headers: authHeaders(accessToken) },
  );
  if (!response.ok) throw new Error('Could not export transactions');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mixmatch-transactions.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}
