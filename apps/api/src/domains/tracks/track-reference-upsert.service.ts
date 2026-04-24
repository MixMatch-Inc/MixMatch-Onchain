import { ITrackReference, CreateTrackReferenceDto, ProviderType } from '@mixmatch/types';
import { ITrackReferenceRepository } from '../../repositories/track-reference.repository';
import {
  IProviderPayloadCache,
  buildCacheKey,
  MongoProviderPayloadCache,
} from './provider-payload-cache';

export interface TrackReferenceUpsertInput {
  provider: ProviderType;
  providerTrackId: string;
  /** Raw payload from the provider – stored as-is and used to populate fields */
  rawPayload: Record<string, unknown>;
  /** Normalized fields derived from rawPayload by the caller */
  normalized: Omit<CreateTrackReferenceDto, 'provider' | 'providerTrackId' | 'rawPayload'>;
}

export interface ITrackReferenceUpsertService {
  upsert(input: TrackReferenceUpsertInput): Promise<ITrackReference>;
  resolveByProviderKey(provider: ProviderType, providerTrackId: string): Promise<ITrackReference | null>;
}

export class TrackReferenceUpsertService implements ITrackReferenceUpsertService {
  constructor(
    private readonly repo: ITrackReferenceRepository,
    private readonly cache: IProviderPayloadCache = new MongoProviderPayloadCache(),
  ) {}

  /**
   * Upsert a canonical track reference from a provider lookup.
   * - De-duplicates by (provider, providerTrackId).
   * - Refreshes mutable fields (previewUrl, artwork, etc.) on every call.
   * - Caches the raw payload so repeated lookups skip the provider.
   */
  async upsert(input: TrackReferenceUpsertInput): Promise<ITrackReference> {
    const { provider, providerTrackId, rawPayload, normalized } = input;

    const dto: CreateTrackReferenceDto = {
      provider,
      providerTrackId,
      rawPayload,
      ...normalized,
    };

    const track = await this.repo.upsert(dto);

    // Refresh cache with latest raw payload
    const key = buildCacheKey(provider, providerTrackId);
    await this.cache.set(key, rawPayload);

    return track;
  }

  /**
   * Resolve a canonical track reference by provider key.
   * Returns null when no record exists yet (caller should do a provider lookup first).
   */
  async resolveByProviderKey(
    provider: ProviderType,
    providerTrackId: string,
  ): Promise<ITrackReference | null> {
    return this.repo.findByProviderAndId(provider, providerTrackId);
  }
}
