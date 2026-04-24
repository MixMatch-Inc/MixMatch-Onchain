import { ProviderType, ITrackReference } from '@mixmatch/types';

export interface NormalizedTrack {
  id: string;
  provider: ProviderType;
  providerTrackId: string;
  title: string;
  artists: Array<{
    name: string;
    providerId?: string;
  }>;
  album?: {
    name: string;
    providerId?: string;
    releaseDate?: Date;
  };
  durationMs: number;
  previewUrl?: string;
  artwork: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  explicit: boolean;
  isrc?: string;
  externalIds?: Record<string, string>;
  genres?: string[];
  popularity?: number;
  audioFeatures?: {
    acousticness?: number;
    danceability?: number;
    energy?: number;
    instrumentalness?: number;
    liveness?: number;
    loudness?: number;
    speechiness?: number;
    valence?: number;
    tempo?: number;
  };
}

export interface ProviderResponse<T> {
  data: T;
  metadata: {
    provider: ProviderType;
    timestamp: Date;
    requestId: string;
    cached: boolean;
  };
}

export interface SearchQuery {
  q: string;
  type?: 'track' | 'album' | 'artist';
  limit?: number;
  offset?: number;
  market?: string;
  includeExternal?: string;
}

export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchResult {
  tracks: NormalizedTrack[];
  pagination: PaginationInfo;
}

export class ProviderError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: any;

  constructor(message: string, code: string, status?: number, details?: any) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.name = 'ProviderError';
  }
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  limit: number;
}

export interface ProviderMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequestTime: Date;
  rateLimitInfo?: RateLimitInfo;
}
