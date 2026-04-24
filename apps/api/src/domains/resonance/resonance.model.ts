import mongoose, { Document, Schema } from 'mongoose';

export type ResonanceStatus = 'active' | 'expired' | 'blocked';

export interface IResonance {
  userA: mongoose.Types.ObjectId;
  userB: mongoose.Types.ObjectId;
  /** Canonical sorted pair key for dedup: `${minId}_${maxId}` */
  pairKey: string;
  status: ResonanceStatus;
  revealInitialized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResonanceDocument extends IResonance, Document {}

const ResonanceSchema = new Schema<IResonanceDocument>(
  {
    userA: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userB: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pairKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'blocked'],
      default: 'active',
    },
    revealInitialized: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ResonanceSchema.index({ userA: 1 });
ResonanceSchema.index({ userB: 1 });

const Resonance = mongoose.model<IResonanceDocument>('Resonance', ResonanceSchema);
export default Resonance;
