import { DjGenre, AvailabilityStatus, ProviderType } from '@mixmatch/types';

export interface DiscoveryDjFixture {
  id: string;
  stageName: string;
  bio: string;
  genres: DjGenre[];
  vibeTags: string[];
  pricing: { min: number; max: number };
  availabilityStatus: AvailabilityStatus;
}

export interface DiscoveryTrackFixture {
  id: string;
  provider: ProviderType;
  providerTrackId: string;
  title: string;
  artists: Array<{ name: string }>;
  durationMs: number;
  previewUrl?: string;
}

/** Fixture DJ profiles for discovery screen tests */
export const DJ_FIXTURES: DiscoveryDjFixture[] = [
  {
    id: 'dj_fixture_001',
    stageName: 'DJ Phantom',
    bio: 'Afrobeats and Amapiano specialist.',
    genres: [DjGenre.AFROBEATS, DjGenre.AMAPIANO],
    vibeTags: ['high-energy', 'festival'],
    pricing: { min: 500, max: 1500 },
    availabilityStatus: AvailabilityStatus.AVAILABLE,
  },
  {
    id: 'dj_fixture_002',
    stageName: 'Orbital Echo',
    bio: 'Deep techno for the after-hours crowd.',
    genres: [DjGenre.TECHNO, DjGenre.DEEP_HOUSE],
    vibeTags: ['late-night', 'underground'],
    pricing: { min: 300, max: 900 },
    availabilityStatus: AvailabilityStatus.LIMITED,
  },
];

/** Fixture tracks for journey player tests */
export const TRACK_FIXTURES: DiscoveryTrackFixture[] = [
  {
    id: 'track_fixture_001',
    provider: ProviderType.SPOTIFY,
    providerTrackId: 'mock_001',
    title: 'Midnight Groove',
    artists: [{ name: 'DJ Phantom' }],
    durationMs: 210000,
    previewUrl: 'https://mock.mixmatch.io/previews/mock_001.mp3',
  },
  {
    id: 'track_fixture_002',
    provider: ProviderType.SPOTIFY,
    providerTrackId: 'mock_002',
    title: 'Afro Sunrise',
    artists: [{ name: 'Kemi Waves' }],
    durationMs: 195000,
    previewUrl: 'https://mock.mixmatch.io/previews/mock_002.mp3',
  },
  {
    id: 'track_fixture_003',
    provider: ProviderType.SPOTIFY,
    providerTrackId: 'mock_003',
    title: 'Deep Space',
    artists: [{ name: 'Orbital Echo' }],
    durationMs: 360000,
    // no previewUrl — blind-mode candidate
  },
];
