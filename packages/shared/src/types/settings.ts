import type { AuthUser } from './auth.js';

export type SocialProvider = 'google' | 'apple';

export interface UserSettings {
  network: 'testnet' | 'public';
  displayCurrency: string;
  language: string;
  notificationPreferences: {
    payments: boolean;
    matches: boolean;
    marketing: boolean;
  };
  biometricsEnabled: boolean;
}

export interface LinkedAccount {
  id: string;
  provider: string;
  label: string;
  lastSyncAt: string | null;
  active: boolean;
}

export interface SocialAuthResult {
  accessToken: string;
  user: AuthUser;
}
