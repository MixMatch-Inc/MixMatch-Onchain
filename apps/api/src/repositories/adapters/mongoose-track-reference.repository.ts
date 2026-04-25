import { ITrackReference, ITrackReferenceRepository, ProviderType, CreateTrackReferenceDto } from '../track-reference.repository';
import TrackReference from '../../domains/journeys/track-reference.model';

const mapToEntity = (doc: any): ITrackReference => ({
  id: String(doc._id),
  provider: doc.provider,
  providerTrackId: doc.providerTrackId,
  title: doc.title,
  artists: doc.artists,
  album: doc.album,
  durationMs: doc.durationMs,
  previewUrl: doc.previewUrl,
  artwork: doc.artwork,
  explicit: doc.explicit,
  audioFeaturesCacheKey: doc.audioFeaturesCacheKey,
  rawPayload: doc.rawPayload,
  ingestedAt: doc.ingestedAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export class MongooseTrackReferenceRepository implements ITrackReferenceRepository {
  async findById(id: string): Promise<ITrackReference | null> {
    const doc = await TrackReference.findById(id).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async findAll(filter?: Partial<ITrackReference>): Promise<ITrackReference[]> {
    const docs = await TrackReference.find(filter).lean();
    return docs.map((doc) => mapToEntity(doc));
  }

  async create(data: Partial<ITrackReference>): Promise<ITrackReference> {
    const doc = await TrackReference.create(data);
    return mapToEntity(doc);
  }

  async update(id: string, data: Partial<ITrackReference>): Promise<ITrackReference | null> {
    const doc = await TrackReference.findByIdAndUpdate(id, data, { new: true }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await TrackReference.findByIdAndDelete(id);
    return result !== null;
  }

  async findByProviderAndId(provider: ProviderType, providerTrackId: string): Promise<ITrackReference | null> {
    const doc = await TrackReference.findOne({ provider, providerTrackId }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async upsert(dto: CreateTrackReferenceDto): Promise<ITrackReference> {
    const doc = await TrackReference.findOneAndUpdate(
      { provider: dto.provider, providerTrackId: dto.providerTrackId },
      { ...dto, ingestedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return mapToEntity(doc);
  }

  async search(query: string, limit: number = 10): Promise<ITrackReference[]> {
    const docs = await TrackReference.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();
    return docs.map((doc) => mapToEntity(doc));
  }

  async findRecent(limit: number = 10): Promise<ITrackReference[]> {
    const docs = await TrackReference.find()
      .sort({ ingestedAt: -1 })
      .limit(limit)
      .lean();
    return docs.map((doc) => mapToEntity(doc));
  }
}