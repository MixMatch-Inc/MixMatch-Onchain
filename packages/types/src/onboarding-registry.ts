/**
 * Onboarding Step Registry Types
 * 
 * Defines the canonical onboarding sequence used by API, web, and mobile clients.
 * Each step has machine-readable prerequisites, optionality rules, and UI metadata keys.
 */

import { UserRole, ProviderType } from './index';

/**
 * Categories of onboarding steps
 */
export enum OnboardingCategory {
  ACCOUNT = 'ACCOUNT',
  PROFILE = 'PROFILE',
  TASTE = 'TASTE',
  PROVIDER = 'PROVIDER',
}

/**
 * Unique identifiers for each onboarding step
 */
export enum OnboardingStepId {
  // Account steps
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  AGE_GATE = 'AGE_GATE',
  LOCATION_PREFERENCES = 'LOCATION_PREFERENCES',
  
  // Profile steps
  BASIC_PROFILE = 'BASIC_PROFILE',
  PROFILE_MEDIA = 'PROFILE_MEDIA',
  VIBE_JOURNEY_DRAFT = 'VIBE_JOURNEY_DRAFT',
  
  // Taste steps
  GENRE_PREFERENCES = 'GENRE_PREFERENCES',
  VIBE_PREFERENCES = 'VIBE_PREFERENCES',
  TASTE_SIGNALS = 'TASTE_SIGNALS',
  
  // Provider steps
  SPOTIFY_LINK = 'SPOTIFY_LINK',
  WALLET_SETUP = 'WALLET_SETUP',
}

/**
 * Prerequisite condition types
 */
export enum PrerequisiteType {
  /** Step requires another step to be completed */
  STEP_COMPLETED = 'STEP_COMPLETED',
  
  /** Step requires a specific user role */
  ROLE_REQUIRED = 'ROLE_REQUIRED',
  
  /** Step requires a minimum account status */
  ACCOUNT_STATUS = 'ACCOUNT_STATUS',
  
  /** Step is only shown if a feature flag is enabled */
  FEATURE_FLAG = 'FEATURE_FLAG',
  
  /** Step requires external provider availability */
  PROVIDER_AVAILABLE = 'PROVIDER_AVAILABLE',
}

/**
 * Defines a prerequisite condition for a step
 */
export interface StepPrerequisite {
  type: PrerequisiteType;
  
  /** For STEP_COMPLETED: the step ID that must be completed */
  stepId?: OnboardingStepId;
  
  /** For ROLE_REQUIRED: allowed roles */
  roles?: UserRole[];
  
  /** For ACCOUNT_STATUS: minimum required status */
  minAccountStatus?: string;
  
  /** For FEATURE_FLAG: feature flag key */
  featureFlag?: string;
  
  /** For PROVIDER_AVAILABLE: provider type */
  providerType?: ProviderType;
  
  /** Whether this prerequisite is optional (soft dependency) */
  isOptional?: boolean;
  
  /** Human-readable reason shown to user if prerequisite not met */
  message?: string;
}

/**
 * Recovery rule types for incomplete onboarding
 */
export enum RecoveryRuleType {
  /** Step can be skipped and revisited later */
  SKIP_AND_RETURN = 'SKIP_AND_RETURN',
  
  /** Step must be completed before proceeding */
  BLOCKING = 'BLOCKING',
  
  /** Step can be completed after onboarding via settings */
  POST_ONBOARDING = 'POST_ONBOARDING',
  
  /** Step auto-completes if condition is met */
  AUTO_COMPLETE = 'AUTO_COMPLETE',
}

/**
 * Recovery rule for a step
 */
export interface RecoveryRule {
  type: RecoveryRuleType;
  
  /** Condition for AUTO_COMPLETE recovery */
  autoCompleteCondition?: string;
  
  /** Where to redirect user to complete this step later */
  returnPath?: string;
  
  /** Whether skipping this step affects onboarding completion percentage */
  affectsCompletionPercentage: boolean;
}

/**
 * UI metadata keys for frontend rendering
 */
export interface StepUIMetadata {
  /** i18n key for step title */
  titleKey: string;
  
  /** i18n key for step description */
  descriptionKey: string;
  
  /** Icon identifier for the step */
  iconKey?: string;
  
  /** Route path for web client */
  webRoute?: string;
  
  /** Screen name for mobile client */
  mobileScreen?: string;
  
  /** Estimated completion time in seconds */
  estimatedTimeSeconds?: number;
  
  /** Whether to show progress indicator */
  showProgress?: boolean;
  
  /** Custom CSS class or theme key */
  themeKey?: string;
}

/**
 * Complete definition of an onboarding step
 */
export interface OnboardingStepDefinition {
  /** Unique step identifier */
  id: OnboardingStepId;
  
  /** Category this step belongs to */
  category: OnboardingCategory;
  
  /** Order in the default sequence (lower = earlier) */
  order: number;
  
  /** Whether this step is required or optional */
  isRequired: boolean;
  
  /** Prerequisites that must be met before this step */
  prerequisites: StepPrerequisite[];
  
  /** Recovery rules for incomplete steps */
  recoveryRule: RecoveryRule;
  
  /** UI metadata for client rendering */
  uiMetadata: StepUIMetadata;
  
  /** Roles this step applies to (empty = all roles) */
  applicableRoles: UserRole[];
  
  /** API endpoint to check step completion status */
  statusEndpoint?: string;
  
  /** API endpoint to submit step data */
  submitEndpoint?: string;
}

/**
 * Registry containing all onboarding step definitions
 */
export interface OnboardingStepRegistry {
  /** Registry version for cache invalidation */
  version: string;
  
  /** All step definitions */
  steps: OnboardingStepDefinition[];
  
  /** Default step order by role */
  defaultOrderByRole: Record<UserRole, OnboardingStepId[]>;
  
  /** Minimum completion percentage to consider onboarding done */
  minimumCompletionPercentage: number;
}

/**
 * User's current progress in onboarding
 */
export interface OnboardingProgress {
  /** User ID */
  userId: string;
  
  /** Map of step ID to completion status */
  stepStatus: Record<OnboardingStepId, OnboardingStepStatus>;
  
  /** Overall completion percentage */
  completionPercentage: number;
  
  /** List of pending step IDs */
  pendingSteps: OnboardingStepId[];
  
  /** Next recommended step */
  nextStep?: OnboardingStepId;
  
  /** Whether onboarding is considered complete */
  isComplete: boolean;
}

/**
 * Status of an individual onboarding step
 */
export enum OnboardingStepStatus {
  /** Step is available and can be started */
  AVAILABLE = 'AVAILABLE',
  
  /** Step prerequisites not yet met */
  LOCKED = 'LOCKED',
  
  /** Step is currently being worked on */
  IN_PROGRESS = 'IN_PROGRESS',
  
  /** Step has been completed */
  COMPLETED = 'COMPLETED',
  
  /** Step was skipped (if allowed) */
  SKIPPED = 'SKIPPED',
  
  /** Step is not applicable for this user/role */
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

/**
 * Response from onboarding status API
 */
export interface OnboardingStatusResponse {
  /** Current onboarding progress */
  progress: OnboardingProgress;
  
  /** Full step definitions for client rendering */
  registry: OnboardingStepRegistry;
  
  /** Timestamp of last status check */
  checkedAt: string;
}
