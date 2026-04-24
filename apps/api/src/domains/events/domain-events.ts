// Typed domain event definitions for the MixMatch platform

export type DomainEventType =
  | 'JOURNEY_PUBLISHED'
  | 'JOURNEY_UNPUBLISHED'
  | 'JOURNEY_UPDATED'
  | 'DISCOVERY_LIKED'
  | 'DISCOVERY_UNLIKED'
  | 'RESONANCE_CREATED'
  | 'RESONANCE_UPDATED'
  | 'TASTE_SIGNAL_CHANGED'
  | 'USER_PRESENCE_CHANGED'
  | 'MESSAGE_SENT'
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED';

export interface DomainEvent<TPayload = unknown> {
  id: string;
  type: DomainEventType;
  payload: TPayload;
  timestamp: Date;
  correlationId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// Specific event payload types
export interface JourneyPublishedPayload {
  journeyId: string;
  userId: string;
  title: string;
  snapshotId: string;
}

export interface ResonanceCreatedPayload {
  resonanceId: string;
  userId: string;
  journeyId: string;
  score: number;
}

export interface DiscoveryLikedPayload {
  userId: string;
  journeyId: string;
  likedByUserId: string;
}

export interface TasteSignalChangedPayload {
  userId: string;
  signalType: string;
  signalValue: unknown;
}

export interface UserPresenceChangedPayload {
  userId: string;
  status: 'online' | 'offline' | 'away';
  sessionId: string;
}
