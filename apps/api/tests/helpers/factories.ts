import {
  UserRole,
  BookingStatus,
  PaymentStatus,
  EventType,
  ProviderType,
  RevealPhase,
  JourneyStatus,
} from '@mixmatch/types';
import type { IVibeJourney, ITrackReference, CreateTrackReferenceDto } from '@mixmatch/types';
import type { IUser } from '../../src/repositories/user.repository';
import type { IBooking } from '../../src/repositories/booking.repository';

let seq = 0;
const next = () => ++seq;

export function buildUser(overrides: Partial<IUser> = {}): IUser {
  const n = next();
  return {
    id: `user-${n}`,
    name: `User ${n}`,
    email: `user${n}@example.com`,
    passwordHash: 'hashed',
    role: UserRole.DJ,
    onboardingCompleted: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function buildBooking(overrides: Partial<IBooking> = {}): IBooking {
  const n = next();
  return {
    id: `booking-${n}`,
    planner: `planner-${n}`,
    dj: `dj-${n}`,
    eventType: EventType.CLUB,
    eventDate: new Date('2025-06-01'),
    budget: 500,
    status: BookingStatus.PENDING,
    paymentStatus: PaymentStatus.NOT_STARTED,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function buildVibeJourney(overrides: Partial<IVibeJourney> = {}): IVibeJourney {
  const n = next();
  return {
    id: `journey-${n}`,
    authorId: `user-${n}`,
    title: `Journey ${n}`,
    status: JourneyStatus.DRAFT,
    slots: [],
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function buildTrackReference(overrides: Partial<ITrackReference> = {}): ITrackReference {
  const n = next();
  return {
    id: `track-${n}`,
    provider: ProviderType.SPOTIFY,
    providerTrackId: `spotify-${n}`,
    title: `Track ${n}`,
    artists: [{ name: `Artist ${n}` }],
    durationMs: 180000,
    artwork: [],
    explicit: false,
    rawPayload: {},
    ingestedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function buildCreateTrackDto(overrides: Partial<CreateTrackReferenceDto> = {}): CreateTrackReferenceDto {
  const n = next();
  return {
    provider: ProviderType.SPOTIFY,
    providerTrackId: `spotify-${n}`,
    title: `Track ${n}`,
    artists: [{ name: `Artist ${n}` }],
    durationMs: 180000,
    artwork: [],
    explicit: false,
    rawPayload: {},
    ...overrides,
  };
}

export function buildRevealState(overrides: Record<string, unknown> = {}) {
  const n = next();
  return {
    id: `reveal-${n}`,
    viewerId: `user-${n}`,
    targetProfileId: `dj-${n}`,
    targetProfileType: 'dj' as const,
    currentPhase: RevealPhase.BLIND,
    revealTriggers: [],
    revealTimestamps: {} as Record<RevealPhase, Date | null>,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}
