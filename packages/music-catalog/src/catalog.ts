import { ProviderType } from '@mixmatch/types';
import { 
  MusicCatalogService, 
  MusicProvider, 
  TrackSearchParams,
  TrackLookupParams,
  PreviewMetadataParams,
  ArtworkRetrievalParams,
  TrackSearchResult
} from './interfaces';
import { ProviderError, ProviderMetrics } from './types';

export class DefaultMusicCatalogService implements MusicCatalogService {
  private providers = new Map<ProviderType, MusicProvider>();
  private metrics = new Map<ProviderType, ProviderMetrics>();

  registerProvider(provider: MusicProvider): void {
    this.providers.set(provider.type, provider);
    this.metrics.set(provider.type, {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date()
    });
  }

  getProvider(type: ProviderType): MusicProvider | null {
    return this.providers.get(type) || null;
  }

  getAllProviders(): MusicProvider[] {
    return Array.from(this.providers.values());
  }

  async searchTracks(
    params: TrackSearchParams, 
    providerType?: ProviderType
  ): Promise<TrackSearchResult> {
    const provider = this.selectProvider(providerType);
    if (!provider) {
      throw new Error(`No provider available for ${providerType || 'search'}`);
    }

    return this.executeWithMetrics(
      provider.type,
      () => provider.searchTracks(params)
    );
  }

  async lookupTrack(
    params: TrackLookupParams, 
    providerType?: ProviderType
  ) {
    const provider = this.selectProvider(providerType);
    if (!provider) {
      throw new Error(`No provider available for ${providerType || 'lookup'}`);
    }

    return this.executeWithMetrics(
      provider.type,
      () => provider.lookupTrack(params)
    );
  }

  async getPreviewMetadata(
    params: PreviewMetadataParams
  ): Promise<string | null> {
    const provider = this.selectProvider(params.provider);
    if (!provider) {
      throw new Error(`No provider available for ${params.provider}`);
    }

    return this.executeWithMetrics(
      provider.type,
      () => provider.getPreviewMetadata(params)
    );
  }

  async getArtwork(
    params: ArtworkRetrievalParams
  ): Promise<string | null> {
    const provider = this.selectProvider(params.provider);
    if (!provider) {
      throw new Error(`No provider available for ${params.provider}`);
    }

    return this.executeWithMetrics(
      provider.type,
      () => provider.getArtwork(params)
    );
  }

  private selectProvider(providerType?: ProviderType): MusicProvider | null {
    if (providerType) {
      return this.providers.get(providerType) || null;
    }

    for (const provider of this.providers.values()) {
      if (provider.capabilities.canSearch) {
        return provider;
      }
    }

    return this.providers.values().next().value || null;
  }

  private async executeWithMetrics<T>(
    providerType: ProviderType,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const metrics = this.metrics.get(providerType);
    
    if (!metrics) {
      throw new Error(`No metrics found for provider ${providerType}`);
    }

    try {
      metrics.requestCount++;
      const result = await operation();
      
      const responseTime = Date.now() - startTime;
      metrics.averageResponseTime = 
        (metrics.averageResponseTime * (metrics.requestCount - 1) + responseTime) / 
        metrics.requestCount;
      metrics.lastRequestTime = new Date();
      
      return result;
    } catch (error) {
      metrics.errorCount++;
      metrics.lastRequestTime = new Date();
      
      if (this.isProviderError(error)) {
        throw error;
      }
      
      throw new ProviderError(
        `Provider ${providerType} error: ${error}`,
        'PROVIDER_ERROR',
        undefined,
        error
      );
    }
  }

  private isProviderError(error: any): error is ProviderError {
    return error && typeof error === 'object' && 'code' in error;
  }

  getMetrics(providerType: ProviderType): ProviderMetrics | null {
    return this.metrics.get(providerType) || null;
  }

  getAllMetrics(): Map<ProviderType, ProviderMetrics> {
    return new Map(this.metrics);
  }
}

export function createMusicCatalogService(): MusicCatalogService {
  return new DefaultMusicCatalogService();
}
