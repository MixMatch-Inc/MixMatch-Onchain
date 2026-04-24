import mongoose, { Document, Schema } from 'mongoose';
import { ProviderType } from '@mixmatch/types';

// ── Cache key helpers ──────────────────────────────────────────────────────────

export const buildCacheKey = (provider: ProviderType, providerTrackId: string): string =>
  `${provider}:${providerTrackId}`;

// ── Swappable cache interface ──────────────────────────────────────────────────

export interface IProviderPayloadCache {
  get(key: string): Promise<Record<string, unknown> | null>;
  set(key: string, payload: Record<string, unknown>, ttlSeconds?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidateByProvider(provider: ProviderType): Promise<void>;
}

// ── Mongo document ─────────────────────────────────────────────────────────────

interface IProviderPayloadCacheDocument extends Document {
  cacheKey: string;
  provider: ProviderType;
  payload: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderPayloadCacheSchema = new Schema<IProviderPayloadCacheDocument>(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    provider: { type: String, enum: Object.values(ProviderType), required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);

const ProviderPayloadCacheModel = mongoose.model<IProviderPayloadCacheDocument>(
  'ProviderPayloadCache',
  ProviderPayloadCacheSchema,
);

// ── Mongo-backed implementation ────────────────────────────────────────────────

export const DEFAULT_TTL_SECONDS = 3600; // 1 hour

export class MongoProviderPayloadCache implements IProviderPayloadCache {
  async get(key: string): Promise<Record<string, unknown> | null> {
    const doc = await ProviderPayloadCacheModel.findOne({
      cacheKey: key,
      expiresAt: { $gt: new Date() },
    }).lean();
    return doc ? (doc.payload as Record<string, unknown>) : null;
  }

  async set(key: string, payload: Record<string, unknown>, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const [provider] = key.split(':') as [ProviderType];
    await ProviderPayloadCacheModel.findOneAndUpdate(
      { cacheKey: key },
      { cacheKey: key, provider, payload, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async invalidate(key: string): Promise<void> {
    await ProviderPayloadCacheModel.deleteOne({ cacheKey: key });
  }

  async invalidateByProvider(provider: ProviderType): Promise<void> {
    await ProviderPayloadCacheModel.deleteMany({ provider });
  }
}
