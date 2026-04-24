import { ProviderType } from '@mixmatch/types';
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
    return {
      tracks: [],
      total: 0,
      limit: params.limit || 20,
      offset: params.offset || 0,
      hasNext: false,
      hasPrev: false
    };
  }

  async lookupTrack(params: any): Promise<any> {
    return null;
  }

  async getPreviewMetadata(params: any): Promise<string | null> {
    return null;
  }

  async getArtwork(params: any): Promise<string | null> {
    return null;
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
