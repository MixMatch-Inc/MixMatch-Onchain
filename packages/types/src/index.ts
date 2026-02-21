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
