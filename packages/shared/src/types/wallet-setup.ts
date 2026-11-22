export interface BalanceItem {
  assetCode: string;
  assetIssuer: string | null;
  balance: string;
}

export interface BalancesResponse {
  publicKey: string;
  network: 'testnet' | 'public' | string;
  balances: BalanceItem[];
}

export interface WalletResponse {
  publicKey: string;
  network: 'testnet' | 'public' | string;
  created?: boolean;
}

export interface FundWalletResponse {
  publicKey: string;
  funded: boolean;
  message: string;
}

export type OnboardingStep = 'profile' | 'music' | 'wallet' | 'fund';

export interface OnboardingProgress {
  completed: OnboardingStep[];
  skipped: boolean;
  updatedAt: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = ['profile', 'music', 'wallet', 'fund'];

export interface ProfileUpdateInput {
  displayName: string;
  bio?: string;
  avatarUrl?: string | null;
}

export interface AvatarUploadResponse {
  avatarUrl: string;
}
