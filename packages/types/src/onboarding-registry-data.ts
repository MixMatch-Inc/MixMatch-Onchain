/**
 * Onboarding Step Registry Implementation
 * 
 * Centralized registry of all onboarding steps with their definitions,
 * prerequisites, recovery rules, and UI metadata.
 */

import {
  OnboardingCategory,
  OnboardingStepId,
  OnboardingStepRegistry,
  OnboardingStepDefinition,
  PrerequisiteType,
  RecoveryRuleType,
} from './onboarding-registry';
import { UserRole, ProviderType } from './index';

/**
 * Canonical onboarding step definitions
 */
export const ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  // ── ACCOUNT STEPS ──────────────────────────────────────────────────────────
  
  {
    id: OnboardingStepId.EMAIL_VERIFICATION,
    category: OnboardingCategory.ACCOUNT,
    order: 1,
    isRequired: true,
    prerequisites: [],
    recoveryRule: {
      type: RecoveryRuleType.BLOCKING,
      affectsCompletionPercentage: true,
    },
    uiMetadata: {
      titleKey: 'onboarding.email_verification.title',
      descriptionKey: 'onboarding.email_verification.description',
      iconKey: 'mail',
      webRoute: '/onboarding/verify-email',
      estimatedTimeSeconds: 60,
      showProgress: false,
    },
    applicableRoles: [UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER],
    statusEndpoint: '/auth/verify/status',
  },
  
  {
    id: OnboardingStepId.AGE_GATE,
    category: OnboardingCategory.ACCOUNT,
    order: 2,
    isRequired: true,
    prerequisites: [],
    recoveryRule: {
      type: RecoveryRuleType.BLOCKING,
      affectsCompletionPercentage: true,
    },
    uiMetadata: {
      titleKey: 'onboarding.age_gate.title',
      descriptionKey: 'onboarding.age_gate.description',
      iconKey: 'calendar',
      webRoute: '/onboarding/age-verification',
      estimatedTimeSeconds: 30,
      showProgress: false,
    },
    applicableRoles: [UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER],
  },
  
  {
    id: OnboardingStepId.LOCATION_PREFERENCES,
    category: OnboardingCategory.ACCOUNT,
    order: 3,
    isRequired: false,
    prerequisites: [
      {
        type: PrerequisiteType.STEP_COMPLETED,
        stepId: OnboardingStepId.AGE_GATE,
        isOptional: false,
      },
    ],
    recoveryRule: {
      type: RecoveryRuleType.SKIP_AND_RETURN,
      returnPath: '/settings/location',
      affectsCompletionPercentage: false,
    },
    uiMetadata: {
      titleKey: 'onboarding.location.title',
      descriptionKey: 'onboarding.location.description',
      iconKey: 'map-pin',
      webRoute: '/onboarding/location',
      mobileScreen: 'OnboardingLocationScreen',
      estimatedTimeSeconds: 45,
      showProgress: true,
    },
    applicableRoles: [UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER],
  },
  
  // ── PROFILE STEPS ──────────────────────────────────────────────────────────
  
  {
    id: OnboardingStepId.BASIC_PROFILE,
    category: OnboardingCategory.PROFILE,
    order: 10,
    isRequired: true,
    prerequisites: [
      {
        type: PrerequisiteType.STEP_COMPLETED,
        stepId: OnboardingStepId.EMAIL_VERIFICATION,
        isOptional: false,
      },
    ],
    recoveryRule: {
      type: RecoveryRuleType.BLOCKING,
      affectsCompletionPercentage: true,
    },
    uiMetadata: {
      titleKey: 'onboarding.basic_profile.title',
      descriptionKey: 'onboarding.basic_profile.description',
      iconKey: 'user',
      webRoute: '/onboarding',
      mobileScreen: 'OnboardingProfileScreen',
      estimatedTimeSeconds: 120,
      showProgress: true,
      themeKey: 'profile-setup',
    },
    applicableRoles: [UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER],
    statusEndpoint: '/profiles/me',
    submitEndpoint: '/profiles',
  },
  
  {
    id: OnboardingStepId.PROFILE_MEDIA,
    category: OnboardingCategory.PROFILE,
    order: 11,
    isRequired: false,
    prerequisites: [
      {
        type: PrerequisiteType.STEP_COMPLETED,
        stepId: OnboardingStepId.BASIC_PROFILE,
        isOptional: false,
      },
    ],
    recoveryRule: {
      type: RecoveryRuleType.POST_ONBOARDING,
      returnPath: '/settings/profile',
      affectsCompletionPercentage: false,
    },
    uiMetadata: {
      titleKey: 'onboarding.profile_media.title',
      descriptionKey: 'onboarding.profile_media.description',
      iconKey: 'image',
      webRoute: '/onboarding/media',
      mobileScreen: 'OnboardingMediaScreen',
      estimatedTimeSeconds: 180,
      showProgress: true,
    },
    applicableRoles: [UserRole.DJ, UserRole.PLANNER],
    submitEndpoint: '/profiles/media',
  },
  
  {
    id: OnboardingStepId.VIBE_JOURNEY_DRAFT,
    category: OnboardingCategory.PROFILE,
    order: 12,
    isRequired: false,
    prerequisites: [
      {
        type: PrerequisiteType.STEP_COMPLETED,
        stepId: OnboardingStepId.BASIC_PROFILE,
        isOptional: false,
      },
    ],
    recoveryRule: {
      type: RecoveryRuleType.SKIP_AND_RETURN,
      returnPath: '/journeys/new',
      affectsCompletionPercentage: false,
    },
    uiMetadata: {
      titleKey: 'onboarding.vibe_journey.title',
      descriptionKey: 'onboarding.vibe_journey.description',
      iconKey: 'music',
      webRoute: '/onboarding/journey',
      mobileScreen: 'OnboardingJourneyScreen',
      estimatedTimeSeconds: 240,
      showProgress: true,
      themeKey: 'journey-creation',
    },
    applicableRoles: [UserRole.DJ, UserRole.MUSIC_LOVER],
    submitEndpoint: '/journeys',
  },
  
  // ── TASTE STEPS ────────────────────────────────────────────────────────────
  
  {
    id: OnboardingStepId.GENRE_PREFERENCES,
    category: OnboardingCategory.TASTE,
    order: 20,
    isRequired: true,
    prerequisites: [
      {
        type: PrerequisiteType.STEP_COMPLETED,
        stepId: OnboardingStepId.BASIC_PROFILE,
        isOptional: false,
      },
    ],
    recoveryRule: {
      type: RecoveryRuleType.BLOCKING,
      affectsCompletionPercentage: true,
    },
    uiMetadata: {
      titleKey: 'onboarding.genres.title',
      descriptionKey: 'onboarding.genres.description',
      iconKey: 'headphones',
      webRoute: '/onboarding/genres',
      mobileScreen: 'OnboardingGenresScreen',
      estimatedTimeSeconds: 90,
      showProgress: true,
    },
    applicableRoles: [UserRole.DJ, UserRole.MUSIC_LOVER],
    submitEndpoint: '/profiles/taste',
  },
  
  {
    id: OnboardingStepId.VIBE_PREFERENCES,
    category: OnboardingCategory.TASTE,
    order: 21,
    isRequired: true,
    prerequisites: [
      {
        type: PrerequisiteType.STEP_COMPLETED,
        stepId: OnboardingStepId.GENRE_PREFERENCES,
        isOptional: false,
      },
    ],
    recoveryRule: {
      type: RecoveryRuleType.BLOCKING,
      affectsCompletionPercentage: true,
    },
    uiMetadata: {
      titleKey: 'onboarding.vibes.title',
      descriptionKey: 'onboarding.vibes.description',
      iconKey: 'sparkles',
      webRoute: '/onboarding/vibes',
      mobileScreen: 'OnboardingVibesScreen',
      estimatedTimeSeconds: 60,
      showProgress: true,
    },
    applicableRoles: [UserRole.DJ, UserRole.MUSIC_LOVER],
    submitEndpoint: '/profiles/taste',
  },
  
  {
    id: OnboardingStepId.TASTE_SIGNALS,
    category: OnboardingCategory.TASTE,
    order: 22,
    isRequired: false,
    prerequisites: [
      {
        type: PrerequisiteType.STEP_COMPLETED,
        stepId: OnboardingStepId.VIBE_PREFERENCES,
        isOptional: false,
      },
    ],
    recoveryRule: {
      type: RecoveryRuleType.POST_ONBOARDING,
      returnPath: '/discover',
      affectsCompletionPercentage: false,
    },
    uiMetadata: {
      titleKey: 'onboarding.taste_signals.title',
      descriptionKey: 'onboarding.taste_signals.description',
      iconKey: 'signal',
      webRoute: '/onboarding/taste-signals',
      mobileScreen: 'OnboardingTasteSignalsScreen',
      estimatedTimeSeconds: 120,
      showProgress: true,
    },
    applicableRoles: [UserRole.MUSIC_LOVER],
    submitEndpoint: '/taste-signals',
  },
  
  // ── PROVIDER STEPS ─────────────────────────────────────────────────────────
  
  {
    id: OnboardingStepId.SPOTIFY_LINK,
    category: OnboardingCategory.PROVIDER,
    order: 30,
    isRequired: false,
    prerequisites: [
      {
        type: PrerequisiteType.PROVIDER_AVAILABLE,
        providerType: ProviderType.SPOTIFY,
        isOptional: true,
        message: 'Spotify integration is currently unavailable',
      },
    ],
    recoveryRule: {
      type: RecoveryRuleType.POST_ONBOARDING,
      returnPath: '/settings/integrations',
      affectsCompletionPercentage: false,
    },
    uiMetadata: {
      titleKey: 'onboarding.spotify.title',
      descriptionKey: 'onboarding.spotify.description',
      iconKey: 'spotify',
      webRoute: '/onboarding/spotify',
      mobileScreen: 'OnboardingSpotifyScreen',
      estimatedTimeSeconds: 90,
      showProgress: false,
      themeKey: 'provider-spotify',
    },
    applicableRoles: [UserRole.DJ, UserRole.MUSIC_LOVER],
    submitEndpoint: '/integrations/spotify/connect',
  },
  
  {
    id: OnboardingStepId.WALLET_SETUP,
    category: OnboardingCategory.PROVIDER,
    order: 31,
    isRequired: false,
    prerequisites: [],
    recoveryRule: {
      type: RecoveryRuleType.POST_ONBOARDING,
      returnPath: '/settings/wallet',
      affectsCompletionPercentage: false,
    },
    uiMetadata: {
      titleKey: 'onboarding.wallet.title',
      descriptionKey: 'onboarding.wallet.description',
      iconKey: 'wallet',
      webRoute: '/onboarding/wallet',
      mobileScreen: 'OnboardingWalletScreen',
      estimatedTimeSeconds: 180,
      showProgress: false,
      themeKey: 'provider-stellar',
    },
    applicableRoles: [UserRole.DJ, UserRole.PLANNER, UserRole.MUSIC_LOVER],
    statusEndpoint: '/wallets/me',
    submitEndpoint: '/wallets/link',
  },
];

/**
 * Default step order by user role
 */
export const DEFAULT_ORDER_BY_ROLE: Record<UserRole, OnboardingStepId[]> = {
  [UserRole.DJ]: [
    OnboardingStepId.EMAIL_VERIFICATION,
    OnboardingStepId.AGE_GATE,
    OnboardingStepId.LOCATION_PREFERENCES,
    OnboardingStepId.BASIC_PROFILE,
    OnboardingStepId.PROFILE_MEDIA,
    OnboardingStepId.VIBE_JOURNEY_DRAFT,
    OnboardingStepId.GENRE_PREFERENCES,
    OnboardingStepId.VIBE_PREFERENCES,
    OnboardingStepId.SPOTIFY_LINK,
    OnboardingStepId.WALLET_SETUP,
  ],
  [UserRole.PLANNER]: [
    OnboardingStepId.EMAIL_VERIFICATION,
    OnboardingStepId.AGE_GATE,
    OnboardingStepId.LOCATION_PREFERENCES,
    OnboardingStepId.BASIC_PROFILE,
    OnboardingStepId.PROFILE_MEDIA,
    OnboardingStepId.WALLET_SETUP,
  ],
  [UserRole.MUSIC_LOVER]: [
    OnboardingStepId.EMAIL_VERIFICATION,
    OnboardingStepId.AGE_GATE,
    OnboardingStepId.LOCATION_PREFERENCES,
    OnboardingStepId.BASIC_PROFILE,
    OnboardingStepId.VIBE_JOURNEY_DRAFT,
    OnboardingStepId.GENRE_PREFERENCES,
    OnboardingStepId.VIBE_PREFERENCES,
    OnboardingStepId.TASTE_SIGNALS,
    OnboardingStepId.SPOTIFY_LINK,
    OnboardingStepId.WALLET_SETUP,
  ],
  [UserRole.ADMIN]: [],
};

/**
 * Complete onboarding step registry
 */
export const ONBOARDING_REGISTRY: OnboardingStepRegistry = {
  version: '1.0.0',
  steps: ONBOARDING_STEPS,
  defaultOrderByRole: DEFAULT_ORDER_BY_ROLE,
  minimumCompletionPercentage: 60, // 60% of required steps must be completed
};

/**
 * Get steps applicable to a specific role
 */
export function getStepsForRole(role: UserRole): OnboardingStepDefinition[] {
  return ONBOARDING_STEPS.filter(
    (step) =>
      step.applicableRoles.length === 0 ||
      step.applicableRoles.includes(role)
  ).sort((a, b) => a.order - b.order);
}

/**
 * Get the default step sequence for a role
 */
export function getStepSequenceForRole(role: UserRole): OnboardingStepId[] {
  return DEFAULT_ORDER_BY_ROLE[role] || [];
}

/**
 * Find a step by ID
 */
export function getStepById(id: OnboardingStepId): OnboardingStepDefinition | undefined {
  return ONBOARDING_STEPS.find((step) => step.id === id);
}

/**
 * Get required steps for a role
 */
export function getRequiredStepsForRole(role: UserRole): OnboardingStepDefinition[] {
  return getStepsForRole(role).filter((step) => step.isRequired);
}

/**
 * Get optional steps for a role
 */
export function getOptionalStepsForRole(role: UserRole): OnboardingStepDefinition[] {
  return getStepsForRole(role).filter((step) => !step.isRequired);
}
