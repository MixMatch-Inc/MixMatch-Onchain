import mongoose, { Document, Schema } from 'mongoose';
import { ISearchIndex, SearchDocument, SearchResult } from '../search-index.repository';

interface ISearchDocumentDocument extends SearchDocument, Document {}

const SearchDocumentSchema = new Schema<ISearchDocumentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, enum: ['profile', 'journey', 'event'], index: true },
    text: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

SearchDocumentSchema.index({ text: 'text' });

const SearchDocumentModel = mongoose.model<ISearchDocumentDocument>('SearchDocument', SearchDocumentSchema);

export class MongooseSearchIndex implements ISearchIndex {
  async index(doc: SearchDocument): Promise<void> {
    await SearchDocumentModel.updateOne(
      { id: doc.id },
      { $set: doc },
      { upsert: true },
    );
  }

  async remove(id: string): Promise<void> {
    await SearchDocumentModel.deleteOne({ id });
  }

  async search(
    query: string,
    options: { type?: SearchDocument['type']; limit?: number } = {},
  ): Promise<SearchResult[]> {
    const filter: Record<string, unknown> = { $text: { $search: query } };
    if (options.type) filter['type'] = options.type;

    const docs = await SearchDocumentModel.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(options.limit ?? 20)
      .lean();

    return docs.map((d) => ({
      id: d.id,
      type: d.type,
      score: (d as unknown as { score: number }).score ?? 0,
      metadata: d.metadata,
    }));
  }
}
