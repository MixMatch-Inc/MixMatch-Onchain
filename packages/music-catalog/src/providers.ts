import { ProviderType, ITrackReference } from '@mixmatch/types';
import { MusicProvider, ProviderConfig } from './interfaces';
import { ProviderError } from './types';

export abstract class BaseMusicProvider implements MusicProvider {
  abstract readonly type: ProviderType;
  abstract readonly name: string;
  abstract readonly capabilities: any;

  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract searchTracks(params: any): Promise<any>;
  abstract lookupTrack(params: any): Promise<any>;
  abstract getPreviewMetadata(params: any): Promise<string | null>;
  abstract getArtwork(params: any): Promise<string | null>;
  abstract checkAccountCapabilities(): Promise<any>;

  protected handleError(error: any, context: string): never {
    if (error instanceof ProviderError) {
      throw error;
    }

    if (error.response) {
      throw new ProviderError(
        `${context}: ${error.response.data?.message || error.message}`,
        error.response.data?.code || 'HTTP_ERROR',
        error.response.status,
        error.response.data
      );
    }

    if (error.request) {
      throw new ProviderError(
        `${context}: Network error`,
        'NETWORK_ERROR',
        undefined,
        error
      );
    }

    throw new ProviderError(
      `${context}: ${error.message}`,
      'UNKNOWN_ERROR',
      undefined,
      error
    );
  }

  protected validateConfig(): void {
    if (!this.config.type) {
      throw new ProviderError('Provider type is required', 'MISSING_CONFIG');
    }

    if (this.config.apiKey && typeof this.config.apiKey !== 'string') {
      throw new ProviderError('API key must be a string', 'INVALID_CONFIG');
    }
  }
}

/** Normalized mock tracks for offline development and tests */
export const MOCK_TRACKS: ITrackReference[] = [
  {
    id: 'mock_001',
    provider: ProviderType.SPOTIFY,
    providerTrackId: 'mock_001',
    title: 'Midnight Groove',
    artists: [{ name: 'DJ Phantom', providerId: 'artist_001' }],
    album: { name: 'Late Night Sessions', providerId: 'album_001', releaseDate: new Date('2023-06-15') },
    durationMs: 210000,
    previewUrl: 'https://mock.mixmatch.io/previews/mock_001.mp3',
    artwork: [
      { url: 'https://mock.mixmatch.io/artwork/mock_001_640.jpg', width: 640, height: 640 },
      { url: 'https://mock.mixmatch.io/artwork/mock_001_300.jpg', width: 300, height: 300 },
    ],
    explicit: false,
    rawPayload: {},
  },
  {
    id: 'mock_002',
    provider: ProviderType.SPOTIFY,
    providerTrackId: 'mock_002',
    title: 'Afro Sunrise',
    artists: [{ name: 'Kemi Waves', providerId: 'artist_002' }],
    album: { name: 'Afrobeats Rising', providerId: 'album_002', releaseDate: new Date('2023-09-01') },
    durationMs: 195000,
    previewUrl: 'https://mock.mixmatch.io/previews/mock_002.mp3',
    artwork: [
      { url: 'https://mock.mixmatch.io/artwork/mock_002_640.jpg', width: 640, height: 640 },
      { url: 'https://mock.mixmatch.io/artwork/mock_002_300.jpg', width: 300, height: 300 },
    ],
    explicit: false,
    rawPayload: {},
  },
  {
    id: 'mock_003',
    provider: ProviderType.SPOTIFY,
    providerTrackId: 'mock_003',
    title: 'Deep Space',
    artists: [{ name: 'Orbital Echo', providerId: 'artist_003' }],
    album: { name: 'Techno Cosmos', providerId: 'album_003', releaseDate: new Date('2022-11-20') },
    durationMs: 360000,
    previewUrl: undefined,
    artwork: [
      { url: 'https://mock.mixmatch.io/artwork/mock_003_640.jpg', width: 640, height: 640 },
    ],
    explicit: false,
    rawPayload: {},
  },
  {
    id: 'mock_004',
    provider: ProviderType.SPOTIFY,
    providerTrackId: 'mock_004',
    title: 'Lagos Nights',
    artists: [
      { name: 'Tunde Beats', providerId: 'artist_004' },
      { name: 'Amara Soul', providerId: 'artist_005' },
    ],
    album: { name: 'West African Vibes', providerId: 'album_004', releaseDate: new Date('2024-01-10') },
    durationMs: 228000,
    previewUrl: 'https://mock.mixmatch.io/previews/mock_004.mp3',
    artwork: [
      { url: 'https://mock.mixmatch.io/artwork/mock_004_640.jpg', width: 640, height: 640 },
      { url: 'https://mock.mixmatch.io/artwork/mock_004_300.jpg', width: 300, height: 300 },
    ],
    explicit: true,
    rawPayload: {},
  },
  {
    id: 'mock_005',
    provider: ProviderType.SPOTIFY,
    providerTrackId: 'mock_005',
    title: 'Piano Rain',
    artists: [{ name: 'Soleil Keys', providerId: 'artist_006' }],
    album: { name: 'Acoustic Moods', providerId: 'album_005', releaseDate: new Date('2023-03-22') },
    durationMs: 183000,
    previewUrl: 'https://mock.mixmatch.io/previews/mock_005.mp3',
    artwork: [
      { url: 'https://mock.mixmatch.io/artwork/mock_005_640.jpg', width: 640, height: 640 },
      { url: 'https://mock.mixmatch.io/artwork/mock_005_300.jpg', width: 300, height: 300 },
    ],
    explicit: false,
    rawPayload: {},
  },
];

export class MockMusicProvider extends BaseMusicProvider {
  readonly type = ProviderType.SPOTIFY;
  readonly name = 'Mock Provider';
  readonly capabilities = {
    canSearch: true,
    canLookup: true,
    canGetPreview: true,
    canGetArtwork: true,
    requiresAuth: false,
    supportsOAuth: false,
    rateLimitPerSecond: 10,
    rateLimitPerHour: 10000
  };

  async searchTracks(params: any): Promise<any> {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const query = (params.query ?? '').toLowerCase();

    const filtered = query
      ? MOCK_TRACKS.filter(
          t =>
            t.title.toLowerCase().includes(query) ||
            t.artists.some(a => a.name.toLowerCase().includes(query)),
        )
      : MOCK_TRACKS;

    const page = filtered.slice(offset, offset + limit);
    return {
      tracks: page,
      total: filtered.length,
      limit,
      offset,
      hasNext: offset + limit < filtered.length,
      hasPrev: offset > 0,
    };
  }

  async lookupTrack(params: any): Promise<ITrackReference | null> {
    return MOCK_TRACKS.find(t => t.providerTrackId === params.providerTrackId) ?? null;
  }

  async getPreviewMetadata(params: any): Promise<string | null> {
    const track = MOCK_TRACKS.find(t => t.providerTrackId === params.trackId);
    return track?.previewUrl ?? null;
  }

  async getArtwork(params: any): Promise<string | null> {
    const track = MOCK_TRACKS.find(t => t.providerTrackId === params.trackId);
    if (!track || track.artwork.length === 0) return null;
    const size = params.size ?? 'large';
    if (size === 'small') return track.artwork[track.artwork.length - 1]?.url ?? null;
    return track.artwork[0]?.url ?? null;
  }

  async checkAccountCapabilities(): Promise<any> {
    return this.capabilities;
  }
}

export function createMockProvider(config?: Partial<ProviderConfig>): MusicProvider {
  return new MockMusicProvider({
    type: ProviderType.SPOTIFY,
    name: 'Mock Provider',
    ...config
  });
}
