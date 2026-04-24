import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ── Auth stack ────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// ── Onboarding stack ──────────────────────────────────────────────────────────
export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingProfile: undefined;
};

// ── Main tab navigator ────────────────────────────────────────────────────────
export type MainTabParamList = {
  Discovery: undefined;
  BlindMode: undefined;
  Resonances: undefined;
  Messages: undefined;
  Events: undefined;
  Settings: undefined;
};

// ── Root stack (wraps everything) ─────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  // Deep-link placeholders
  Notification: { notificationId: string };
  SharedTrack: { trackId: string };
};

// Convenience prop types
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
