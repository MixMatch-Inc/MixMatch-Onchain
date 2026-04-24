import { ProviderType, ITrackReference } from '@mixmatch/types';
import { BaseMusicProvider } from './providers';
import { 
  TrackSearchParams, 
  TrackLookupParams, 
  PreviewMetadataParams, 
  ArtworkRetrievalParams,
  TrackSearchResult,
  ProviderConfig,
  ProviderAccountCapabilities
} from './interfaces';
import { ProviderError } from './types';

export interface SpotifyTrackResponse {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    release_date: string;
    images: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  duration_ms: number;
  preview_url: string | null;
  explicit: boolean;
  external_ids: {
    isrc?: string;
  };
  popularity: number;
  uri: string;
}

export interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrackResponse[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class SpotifyProvider extends BaseMusicProvider {
  readonly type = ProviderType.SPOTIFY;
  readonly name = 'Spotify';
  readonly capabilities: ProviderAccountCapabilities = {
    canSearch: true,
    canLookup: true,
    canGetPreview: true,
    canGetArtwork: true,
    requiresAuth: true,
    supportsOAuth: true,
    rateLimitPerSecond: 10,
    rateLimitPerHour: 10000
  };

  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: ProviderConfig) {
    super(config);
    this.validateConfig();
  }

  async searchTracks(params: TrackSearchParams): Promise<TrackSearchResult> {
    const searchParams = new URLSearchParams({
      q: params.query,
      type: 'track',
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString()
    });

    if (params.market) {
      searchParams.append('market', params.market);
    }

    if (params.artist) {
      searchParams.append('q', `artist:${params.artist}`);
    }

    if (params.album) {
      searchParams.append('q', `album:${params.album}`);
    }

    if (params.year) {
      searchParams.append('q', `year:${params.year}`);
    }

    try {
      const response = await this.makeSpotifyRequest<SpotifySearchResponse>(
        `/search?${searchParams.toString()}`
      );

      const tracks = response.tracks.items.map(track => this.normalizeTrack(track));

      return {
        tracks,
        total: response.tracks.total,
        limit: response.tracks.limit,
        offset: response.tracks.offset,
        hasNext: response.tracks.next !== null,
        hasPrev: response.tracks.previous !== null
      };
    } catch (error) {
      this.handleError(error, 'Spotify search failed');
    }
  }

  async lookupTrack(params: TrackLookupParams): Promise<ITrackReference | null> {
    try {
      const track = await this.makeSpotifyRequest<SpotifyTrackResponse>(
        `/tracks/${params.providerTrackId}${params.market ? `?market=${params.market}` : ''}`
      );

      return this.normalizeTrack(track);
    } catch (error) {
      if (error instanceof ProviderError && error.status === 404) {
        return null;
      }
      this.handleError(error, 'Spotify track lookup failed');
    }
  }

  async getPreviewMetadata(params: PreviewMetadataParams): Promise<string | null> {
    try {
      const track = await this.makeSpotifyRequest<SpotifyTrackResponse>(
        `/tracks/${params.trackId}${params.market ? `?market=${params.market}` : ''}`
      );

      return track.preview_url;
    } catch (error) {
      this.handleError(error, 'Spotify preview metadata failed');
    }
  }

  async getArtwork(params: ArtworkRetrievalParams): Promise<string | null> {
    try {
      const track = await this.makeSpotifyRequest<SpotifyTrackResponse>(
        `/tracks/${params.trackId}${params.market ? `?market=${params.market}` : ''}`
      );

      const sizeMap = {
        small: 64,
        medium: 300,
        large: 640,
        extralarge: 1000
      };

      const targetSize = sizeMap[params.size || 'medium'] || 300;
      
      const bestImage = track.album.images
        .filter(img => img.width && img.width >= targetSize)
        .sort((a, b) => (a.width || 0) - (b.width || 0))[0] ||
        track.album.images[track.album.images.length - 1];

      return bestImage?.url || null;
    } catch (error) {
      this.handleError(error, 'Spotify artwork retrieval failed');
    }
  }

  async checkAccountCapabilities(): Promise<ProviderAccountCapabilities> {
    try {
      await this.getValidToken();
      return this.capabilities;
    } catch (error) {
      throw new ProviderError(
        'Spotify authentication failed',
        'AUTH_ERROR',
        undefined,
        error
      );
    }
  }

  private normalizeTrack(spotifyTrack: SpotifyTrackResponse): ITrackReference {
    return {
      id: `spotify_${spotifyTrack.id}`,
      provider: ProviderType.SPOTIFY,
      providerTrackId: spotifyTrack.id,
      title: spotifyTrack.name,
      artists: spotifyTrack.artists.map(artist => ({
        name: artist.name,
        providerId: artist.id
      })),
      album: {
        name: spotifyTrack.album.name,
        providerId: spotifyTrack.album.id,
        releaseDate: new Date(spotifyTrack.album.release_date)
      },
      durationMs: spotifyTrack.duration_ms,
      previewUrl: spotifyTrack.preview_url || undefined,
      artwork: spotifyTrack.album.images.map(img => ({
        url: img.url,
        width: img.width,
        height: img.height
      })),
      explicit: spotifyTrack.explicit,
      rawPayload: spotifyTrack,
      ingestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async makeSpotifyRequest<T>(endpoint: string): Promise<T> {
    const token = await this.getValidToken();
    const baseUrl = this.config.baseURL || 'https://api.spotify.com/v1';
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ProviderError(
        errorData?.error?.message || `Spotify API error: ${response.statusText}`,
        errorData?.error?.status || 'SPOTIFY_API_ERROR',
        response.status,
        errorData
      );
    }

    return response.json();
  }

  private async getValidToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new ProviderError(
        'Spotify client credentials are required',
        'MISSING_CREDENTIALS'
      );
    }

    const credentials = btoa(
      `${this.config.apiKey}:${this.config.apiSecret}`
    );

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ProviderError(
        errorData?.error_description || 'Failed to obtain Spotify access token',
        errorData?.error || 'TOKEN_ERROR',
        response.status,
        errorData
      );
    }

    const tokenData: SpotifyTokenResponse = await response.json();
    
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in - 60) * 1000);

    return this.accessToken;
  }

  protected validateConfig(): void {
    super.validateConfig();

    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new ProviderError(
        'Spotify API key and secret are required',
        'MISSING_CONFIG'
      );
    }
  }
}

export function createSpotifyProvider(config: ProviderConfig): SpotifyProvider {
  return new SpotifyProvider(config);
}
