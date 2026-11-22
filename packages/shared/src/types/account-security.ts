export interface NotificationPreferences {
  payments: boolean;
  matches: boolean;
  marketing: boolean;
}

export interface DeviceTokenRequest {
  token: string;
  platform: 'ios' | 'android' | 'web' | 'unknown';
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  from?: string;
  to?: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
