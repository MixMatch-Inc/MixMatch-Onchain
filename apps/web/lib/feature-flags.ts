/**
 * Feature flags for progressive rollout of MixMatch product areas.
 * In production these would be driven by a remote config / env vars.
 */
export const FEATURE_FLAGS = {
  blindMode: process.env.NEXT_PUBLIC_FF_BLIND_MODE === 'true',
  events: process.env.NEXT_PUBLIC_FF_EVENTS === 'true',
  wallet: process.env.NEXT_PUBLIC_FF_WALLET === 'true',
  messages: process.env.NEXT_PUBLIC_FF_MESSAGES === 'true',
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
