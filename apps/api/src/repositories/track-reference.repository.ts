import { IRepository } from './types';
import { ITrackReference, ProviderType, CreateTrackReferenceDto } from '@mixmatch/types';

export type { ITrackReference, CreateTrackReferenceDto };
export { ProviderType };

export interface ITrackReferenceRepository extends IRepository<ITrackReference, string> {
  findByProviderAndId(provider: ProviderType, providerTrackId: string): Promise<ITrackReference | null>;
  upsert(dto: CreateTrackReferenceDto): Promise<ITrackReference>;
  search(query: string, limit?: number): Promise<ITrackReference[]>;
  findRecent(limit?: number): Promise<ITrackReference[]>;
}
