export enum UserRole {
  DJ = "DJ",
  PLANNER = "PLANNER",
  MUSIC_LOVER = "MUSIC_LOVER",
  ADMIN = "ADMIN",
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum ModerationState {
  CLEAR = 'CLEAR',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESTRICTED = 'RESTRICTED',
  BANNED = 'BANNED',
}

export enum VisibilityPreference {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  FRIENDS_ONLY = 'FRIENDS_ONLY',
}

export enum DjGenre {
  AFROBEATS = "AFROBEATS",
  AMAPIANO = "AMAPIANO",
  DANCEHALL = "DANCEHALL",
  DEEP_HOUSE = "DEEP_HOUSE",
  DRUM_AND_BASS = "DRUM_AND_BASS",
  EDM = "EDM",
  HIP_HOP = "HIP_HOP",
  HOUSE = "HOUSE",
  LATIN = "LATIN",
  POP = "POP",
  RNB = "RNB",
  TECHNO = "TECHNO",
  TRAP = "TRAP",
}

export enum AvailabilityStatus {
  AVAILABLE = "AVAILABLE",
  LIMITED = "LIMITED",
  UNAVAILABLE = "UNAVAILABLE",
}

export enum EventType {
  CLUB = "CLUB",
  CONCERT = "CONCERT",
  CORPORATE = "CORPORATE",
  FESTIVAL = "FESTIVAL",
  PRIVATE_PARTY = "PRIVATE_PARTY",
  WEDDING = "WEDDING",
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPrivacySettings {
  blindListeningEligible: boolean;
  profileRevealAllowed: boolean;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  visibilityPreference: VisibilityPreference;
}

export interface IUserAggregate extends IUser {
  accountStatus: AccountStatus;
  timezone: string;
  locale: string;
  visibilityPreference: VisibilityPreference;
  ageGatePassed: boolean;
  ageGatePassedAt?: Date;
  moderationState: ModerationState;
  privacySettings: IPrivacySettings;
  lastActiveAt: Date;
}

export interface ISocialLinks {
  instagram?: string;
  soundcloud?: string;
  youtube?: string;
  spotify?: string;
  website?: string;
}

export interface IPricingRange {
  min: number;
  max: number;
}

export type GeoPoint = {
  type: "Point";
  coordinates: [number, number];
};

export interface IDjProfile {
  id: string;
  user: string;
  stageName: string;
  bio?: string;
  genres: DjGenre[];
  vibeTags: string[];
  pricing: IPricingRange;
  location?: string | GeoPoint;
  availabilityStatus: AvailabilityStatus;
  socialLinks?: ISocialLinks;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlannerProfile {
  id: string;
  user: string;
  organizationName: string;
  typicalEventTypes: EventType[];
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoverProfile {
  id: string;
  user: string;
  favoriteGenres: DjGenre[];
  preferredVibes: string[];
  followedDjs: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum RevealPhase {
  BLIND = 'BLIND',
  ANONYMOUS = 'ANONYMOUS',
  BASIC = 'BASIC',
  FULL = 'FULL',
  BLOCKED = 'BLOCKED',
}

export enum RevealTrigger {
  MUTUAL_FOLLOW = 'MUTUAL_FOLLOW',
  MESSAGE_SENT = 'MESSAGE_SENT',
  BOOKING_REQUEST = 'BOOKING_REQUEST',
  ADMIN_OVERRIDE = 'ADMIN_OVERRIDE',
  TIME_BASED = 'TIME_BASED',
}

export interface IRevealState {
  id: string;
  viewerId: string;
  targetProfileId: string;
  targetProfileType: 'dj' | 'planner' | 'lover';
  currentPhase: RevealPhase;
  revealTriggers: RevealTrigger[];
  revealTimestamps: Record<RevealPhase, Date | null>;
  blockedReason?: string;
  blockedBy?: string;
  blockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponseDto {
  token: string;
  user: IUser;
}

export interface CurrentUserResponseDto {
  user: IUser;
}

export interface RegisterRequestDto {
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface CreateDjProfileDto {
  stageName: string;
  bio?: string;
  genres: DjGenre[];
  vibeTags: string[];
  pricing: IPricingRange;
  location?: string | GeoPoint;
  availabilityStatus?: AvailabilityStatus;
  socialLinks?: ISocialLinks;
}

export type UpdateDjProfileDto = Partial<CreateDjProfileDto>;

export interface CreatePlannerProfileDto {
  organizationName: string;
  typicalEventTypes: EventType[];
  website?: string;
}

export type UpdatePlannerProfileDto = Partial<CreatePlannerProfileDto>;

export interface CreateLoverProfileDto {
  favoriteGenres: DjGenre[];
  preferredVibes: string[];
}

export type UpdateLoverProfileDto = Partial<CreateLoverProfileDto>;

export type ProfileDto = IDjProfile | IPlannerProfile | ILoverProfile;

export interface ProfileResponseDto<TProfile = ProfileDto> {
  profile: TProfile;
}

export interface DjDiscoveryItemDto {
  id: string;
  stageName: string;
  bio?: string;
  genres: DjGenre[];
  vibeTags: string[];
  pricing: IPricingRange;
  location?: string | GeoPoint;
  availabilityStatus: AvailabilityStatus;
  socialLinks?: ISocialLinks;
}

export interface DjDiscoveryQueryDto {
  q?: string;
  genre?: DjGenre;
  availabilityStatus?: AvailabilityStatus;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponseDto<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
}

export enum BookingStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  CANCELLED = "CANCELLED",
}

export enum PaymentStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
}

export interface BookingSummaryDto {
  id: string;
  plannerId: string;
  djId: string;
  eventType: EventType;
  eventDate: string;
  budget: number;
  notes?: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingDto {
  djId: string;
  eventType: EventType;
  eventDate: string;
  budget: number;
  notes?: string;
}

export interface UpdateBookingStatusDto {
  status: BookingStatus.ACCEPTED | BookingStatus.DECLINED;
  responseNote?: string;
export enum ProviderType {
  SPOTIFY = 'SPOTIFY',
  APPLE_MUSIC = 'APPLE_MUSIC',
  YOUTUBE = 'YOUTUBE',
  SOUNDCLOUD = 'SOUNDCLOUD',
}

export interface Artist {
  name: string;
  providerId?: string;
}

export interface Album {
  name: string;
  providerId?: string;
  releaseDate?: Date;
}

export interface Artwork {
  url: string;
  width?: number;
  height?: number;
}

export interface ITrackReference {
  id: string;
  provider: ProviderType;
  providerTrackId: string;
  title: string;
  artists: Artist[];
  album?: Album;
  durationMs: number;
  previewUrl?: string;
  artwork: Artwork[];
  explicit: boolean;
  audioFeaturesCacheKey?: string;
  rawPayload: Record<string, any>; // bounded subdocument for debugging
  ingestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTrackReferenceDto {
  provider: ProviderType;
  providerTrackId: string;
  title: string;
  artists: Artist[];
  album?: Album;
  durationMs: number;
  previewUrl?: string;
  artwork: Artwork[];
  explicit: boolean;
  audioFeaturesCacheKey?: string;
  rawPayload: Record<string, any>;
}

export enum JourneyStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export interface JourneySlot {
  order: number;
  trackId: string; // provider track reference
  caption?: string; // authored caption
}

export interface IVibeJourney {
  id: string;
  authorId: string;
  title: string;
  description?: string;
  status: JourneyStatus;
  version: number;
  publishedAt?: Date;
  slots: JourneySlot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJourneyDto {
  title: string;
  description?: string;
  slots?: JourneySlot[];
}

export interface UpdateJourneyDto {
  title?: string;
  description?: string;
  slots?: JourneySlot[];
}

export interface PublishJourneyDto {
  // perhaps no fields, just publish the draft
}

// Export all error types
export * from "./errors";
export * from "./client-errors";
