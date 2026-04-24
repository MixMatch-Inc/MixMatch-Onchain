import { IVibeJourney, IVibeJourneyRepository, JourneyStatus } from '../vibe-journey.repository';
import VibeJourney from '../../domains/journeys/vibe-journey.model';

const mapToEntity = (doc: any): IVibeJourney => ({
  id: String(doc._id),
  authorId: String(doc.author),
  title: doc.title,
  description: doc.description,
  status: doc.status,
  version: doc.version,
  publishedAt: doc.publishedAt,
  slots: doc.slots,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export class MongooseVibeJourneyRepository implements IVibeJourneyRepository {
  async findById(id: string): Promise<IVibeJourney | null> {
    const doc = await VibeJourney.findById(id).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async findAll(filter?: Partial<IVibeJourney>): Promise<IVibeJourney[]> {
    const docs = await VibeJourney.find(filter).lean();
    return docs.map((doc) => mapToEntity(doc));
  }

  async create(data: Partial<IVibeJourney>): Promise<IVibeJourney> {
    const doc = await VibeJourney.create({
      ...data,
      author: data.authorId,
      status: JourneyStatus.DRAFT,
      version: 1,
    });
    return mapToEntity(doc);
  }

  async update(id: string, data: Partial<IVibeJourney>): Promise<IVibeJourney | null> {
    // Prevent updates to published journeys
    const existing = await VibeJourney.findById(id);
    if (!existing) return null;
    if (existing.status === JourneyStatus.PUBLISHED) {
      throw new Error('Cannot update published journey');
    }
    const doc = await VibeJourney.findByIdAndUpdate(id, data, { new: true }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    // Prevent deletion of published journeys
    const existing = await VibeJourney.findById(id);
    if (!existing) return false;
    if (existing.status === JourneyStatus.PUBLISHED) {
      throw new Error('Cannot delete published journey');
    }
    const result = await VibeJourney.findByIdAndDelete(id);
    return result !== null;
  }

  async findByAuthor(authorId: string, status?: JourneyStatus): Promise<IVibeJourney[]> {
    const filter: any = { author: authorId };
    if (status) filter.status = status;
    const docs = await VibeJourney.find(filter).sort({ updatedAt: -1 }).lean();
    return docs.map((doc) => mapToEntity(doc));
  }

  async findPublishedByAuthor(authorId: string): Promise<IVibeJourney[]> {
    const docs = await VibeJourney.find({
      author: authorId,
      status: JourneyStatus.PUBLISHED,
    }).sort({ publishedAt: -1 }).lean();
    return docs.map((doc) => mapToEntity(doc));
  }

  async findLatestPublished(limit: number = 10): Promise<IVibeJourney[]> {
    const docs = await VibeJourney.find({
      status: JourneyStatus.PUBLISHED,
    }).sort({ publishedAt: -1 }).limit(limit).lean();
    return docs.map((doc) => mapToEntity(doc));
  }

  async publish(id: string): Promise<IVibeJourney | null> {
    const existing = await VibeJourney.findById(id);
    if (!existing) return null;
    if (existing.status === JourneyStatus.PUBLISHED) {
      throw new Error('Journey is already published');
    }
    // Increment version if republishing
    const latestVersion = await VibeJourney.findOne({
      author: existing.author,
      status: JourneyStatus.PUBLISHED,
    }).sort({ version: -1 }).select('version');
    const newVersion = latestVersion ? latestVersion.version + 1 : 1;
    const doc = await VibeJourney.findByIdAndUpdate(
      id,
      {
        status: JourneyStatus.PUBLISHED,
        version: newVersion,
        publishedAt: new Date(),
      },
      { new: true },
    ).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async updateDraft(id: string, data: Partial<IVibeJourney>): Promise<IVibeJourney | null> {
    const existing = await VibeJourney.findById(id);
    if (!existing) return null;
    if (existing.status !== JourneyStatus.DRAFT) {
      throw new Error('Can only update draft journeys');
    }
    const doc = await VibeJourney.findByIdAndUpdate(id, data, { new: true }).lean();
    return doc ? mapToEntity(doc) : null;
  }
}