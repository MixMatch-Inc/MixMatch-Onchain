import { ProviderType, ITrackReference } from '@mixmatch/types';

export interface TrackSearchParams {
  query: string;
  limit?: number;
  offset?: number;
  market?: string;
  genre?: string;
  artist?: string;
  album?: string;
  year?: number;
  durationMin?: number;
  durationMax?: number;
}

export interface TrackSearchResult {
  tracks: ITrackReference[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TrackLookupParams {
  providerTrackId: string;
  market?: string;
}

export interface PreviewMetadataParams {
  trackId: string;
  provider: ProviderType;
  market?: string;
}

export interface ArtworkRetrievalParams {
  trackId: string;
  provider: ProviderType;
  size?: 'small' | 'medium' | 'large' | 'extralarge';
  market?: string;
}

export interface ProviderAccountCapabilities {
  canSearch: boolean;
  canLookup: boolean;
  canGetPreview: boolean;
  canGetArtwork: boolean;
  requiresAuth: boolean;
  supportsOAuth: boolean;
  rateLimitPerSecond?: number;
  rateLimitPerHour?: number;
}

export interface MusicProvider {
  readonly type: ProviderType;
  readonly name: string;
  readonly capabilities: ProviderAccountCapabilities;
  
  searchTracks(params: TrackSearchParams): Promise<TrackSearchResult>;
  lookupTrack(params: TrackLookupParams): Promise<ITrackReference | null>;
  getPreviewMetadata(params: PreviewMetadataParams): Promise<string | null>;
  getArtwork(params: ArtworkRetrievalParams): Promise<string | null>;
  checkAccountCapabilities(): Promise<ProviderAccountCapabilities>;
}

export interface MusicCatalogService {
  registerProvider(provider: MusicProvider): void;
  getProvider(type: ProviderType): MusicProvider | null;
  getAllProviders(): MusicProvider[];
  searchTracks(params: TrackSearchParams, providerType?: ProviderType): Promise<TrackSearchResult>;
  lookupTrack(params: TrackLookupParams, providerType?: ProviderType): Promise<ITrackReference | null>;
  getPreviewMetadata(params: PreviewMetadataParams): Promise<string | null>;
  getArtwork(params: ArtworkRetrievalParams): Promise<string | null>;
}

export interface ProviderConfig {
  type: ProviderType;
  name: string;
  apiKey?: string;
  apiSecret?: string;
  baseURL?: string;
  timeout?: number;
  rateLimit?: {
    perSecond: number;
    perHour: number;
  };
  auth?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    scopes?: string[];
  };
}
