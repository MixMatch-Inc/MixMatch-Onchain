import { Schema, model, Document } from 'mongoose';

export interface IFeatureVector extends Document {
  userId: string;
  journeyId?: string;
  schemaVersion: number;
  mood: number[];          // embedding / scalar scores
  tempo: number;           // BPM-normalised 0-1
  lyricalTheme: string[];  // tags
  listeningTime: number;   // seconds
  sequencing: number[];    // positional weights
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureVectorSchema = new Schema<IFeatureVector>(
  {
    userId: { type: String, required: true, index: true },
    journeyId: { type: String, index: true },
    schemaVersion: { type: Number, required: true, default: 1 },
    mood: { type: [Number], default: [] },
    tempo: { type: Number, default: 0 },
    lyricalTheme: { type: [String], default: [] },
    listeningTime: { type: Number, default: 0 },
    sequencing: { type: [Number], default: [] },
    generatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

// Compound index for fast per-user/journey lookups
FeatureVectorSchema.index({ userId: 1, journeyId: 1, schemaVersion: 1 });

export const FeatureVectorModel = model<IFeatureVector>('FeatureVector', FeatureVectorSchema);

/** Store an empty/mock vector for a user (or user+journey). */
export async function storePlaceholderVector(
  userId: string,
  journeyId?: string,
): Promise<IFeatureVector> {
  return FeatureVectorModel.create({ userId, journeyId });
}
