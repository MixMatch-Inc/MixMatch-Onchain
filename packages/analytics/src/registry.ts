// Canonical analytics event names
export const AnalyticsEvent = {
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  // Journey authoring
  JOURNEY_CREATED: 'journey_created',
  JOURNEY_PUBLISHED: 'journey_published',
  JOURNEY_TRACK_ADDED: 'journey_track_added',
  // Discovery
  DISCOVERY_FEED_VIEWED: 'discovery_feed_viewed',
  DISCOVERY_ITEM_CLICKED: 'discovery_item_clicked',
  DISCOVERY_LIKED: 'discovery_liked',
  // Resonance
  RESONANCE_CREATED: 'resonance_created',
  // Messaging
  MESSAGE_UNLOCK_INITIATED: 'message_unlock_initiated',
  // Events / bookings
  EVENT_JOIN_REQUESTED: 'event_join_requested',
  // Entitlements
  ENTITLEMENT_USED: 'entitlement_used',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

// Payload schemas per event
export interface OnboardingStartedPayload {
  userId: string;
  role: string;
}

export interface OnboardingStepCompletedPayload {
  userId: string;
  step: string;
}

export interface OnboardingCompletedPayload {
  userId: string;
}

export interface JourneyCreatedPayload {
  userId: string;
  journeyId: string;
}

export interface JourneyPublishedPayload {
  userId: string;
  journeyId: string;
}

export interface JourneyTrackAddedPayload {
  userId: string;
  journeyId: string;
  trackId: string;
}

export interface DiscoveryFeedViewedPayload {
  userId: string;
  page: number;
}

export interface DiscoveryItemClickedPayload {
  userId: string;
  itemId: string;
}

export interface DiscoveryLikedPayload {
  userId: string;
  itemId: string;
}

export interface ResonanceCreatedPayload {
  userId: string;
  journeyId: string;
  score: number;
}

export interface MessageUnlockInitiatedPayload {
  userId: string;
  targetUserId: string;
}

export interface EventJoinRequestedPayload {
  userId: string;
  eventId: string;
}

export interface EntitlementUsedPayload {
  userId: string;
  entitlement: string;
}

// Map event name → payload type
export interface AnalyticsEventPayloadMap {
  [AnalyticsEvent.ONBOARDING_STARTED]: OnboardingStartedPayload;
  [AnalyticsEvent.ONBOARDING_STEP_COMPLETED]: OnboardingStepCompletedPayload;
  [AnalyticsEvent.ONBOARDING_COMPLETED]: OnboardingCompletedPayload;
  [AnalyticsEvent.JOURNEY_CREATED]: JourneyCreatedPayload;
  [AnalyticsEvent.JOURNEY_PUBLISHED]: JourneyPublishedPayload;
  [AnalyticsEvent.JOURNEY_TRACK_ADDED]: JourneyTrackAddedPayload;
  [AnalyticsEvent.DISCOVERY_FEED_VIEWED]: DiscoveryFeedViewedPayload;
  [AnalyticsEvent.DISCOVERY_ITEM_CLICKED]: DiscoveryItemClickedPayload;
  [AnalyticsEvent.DISCOVERY_LIKED]: DiscoveryLikedPayload;
  [AnalyticsEvent.RESONANCE_CREATED]: ResonanceCreatedPayload;
  [AnalyticsEvent.MESSAGE_UNLOCK_INITIATED]: MessageUnlockInitiatedPayload;
  [AnalyticsEvent.EVENT_JOIN_REQUESTED]: EventJoinRequestedPayload;
  [AnalyticsEvent.ENTITLEMENT_USED]: EntitlementUsedPayload;
}

// Required fields per event (for validation)
const REQUIRED_FIELDS: Record<AnalyticsEventName, string[]> = {
  [AnalyticsEvent.ONBOARDING_STARTED]: ['userId', 'role'],
  [AnalyticsEvent.ONBOARDING_STEP_COMPLETED]: ['userId', 'step'],
  [AnalyticsEvent.ONBOARDING_COMPLETED]: ['userId'],
  [AnalyticsEvent.JOURNEY_CREATED]: ['userId', 'journeyId'],
  [AnalyticsEvent.JOURNEY_PUBLISHED]: ['userId', 'journeyId'],
  [AnalyticsEvent.JOURNEY_TRACK_ADDED]: ['userId', 'journeyId', 'trackId'],
  [AnalyticsEvent.DISCOVERY_FEED_VIEWED]: ['userId', 'page'],
  [AnalyticsEvent.DISCOVERY_ITEM_CLICKED]: ['userId', 'itemId'],
  [AnalyticsEvent.DISCOVERY_LIKED]: ['userId', 'itemId'],
  [AnalyticsEvent.RESONANCE_CREATED]: ['userId', 'journeyId', 'score'],
  [AnalyticsEvent.MESSAGE_UNLOCK_INITIATED]: ['userId', 'targetUserId'],
  [AnalyticsEvent.EVENT_JOIN_REQUESTED]: ['userId', 'eventId'],
  [AnalyticsEvent.ENTITLEMENT_USED]: ['userId', 'entitlement'],
};

export interface ValidationResult {
  valid: boolean;
  missingFields: string[];
}

export function validateAnalyticsPayload(
  event: AnalyticsEventName,
  payload: Record<string, unknown>,
): ValidationResult {
  const required = REQUIRED_FIELDS[event] ?? [];
  const missingFields = required.filter(
    (f) => payload[f] === undefined || payload[f] === null,
  );
  return { valid: missingFields.length === 0, missingFields };
}
