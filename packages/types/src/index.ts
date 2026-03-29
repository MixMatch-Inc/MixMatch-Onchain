export enum UserRole {
  DJ = 'DJ',
  PLANNER = 'PLANNER',
  MUSIC_LOVER = 'MUSIC_LOVER',
  ADMIN = 'ADMIN',
}

export enum DjGenre {
  AFROBEATS = 'AFROBEATS',
  AMAPIANO = 'AMAPIANO',
  DANCEHALL = 'DANCEHALL',
  DEEP_HOUSE = 'DEEP_HOUSE',
  DRUM_AND_BASS = 'DRUM_AND_BASS',
  EDM = 'EDM',
  HIP_HOP = 'HIP_HOP',
  HOUSE = 'HOUSE',
  LATIN = 'LATIN',
  POP = 'POP',
  RNB = 'RNB',
  TECHNO = 'TECHNO',
  TRAP = 'TRAP',
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  LIMITED = 'LIMITED',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum EventType {
  CLUB = 'CLUB',
  CONCERT = 'CONCERT',
  CORPORATE = 'CORPORATE',
  FESTIVAL = 'FESTIVAL',
  PRIVATE_PARTY = 'PRIVATE_PARTY',
  WEDDING = 'WEDDING',
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
  type: 'Point';
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
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
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
}

export interface PaymentIntentDto {
  bookingId: string;
  amount: number;
  memo?: string;
}
