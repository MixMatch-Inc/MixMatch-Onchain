import mongoose, { Document, Schema } from 'mongoose';

export type ResonanceStatus = 'active' | 'expired' | 'blocked';

export interface IResonance {
  userA: mongoose.Types.ObjectId;
  userB: mongoose.Types.ObjectId;
  /** Canonical sorted pair key for dedup: `${minId}_${maxId}` */
  pairKey: string;
  status: ResonanceStatus;
  revealInitialized: boolean;
export enum ResonanceRevealStatus {
  PENDING = 'PENDING',
  REVEALED = 'REVEALED',
  BLOCKED = 'BLOCKED',
}

export enum SongExchangeState {
  NONE = 'NONE',
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
  EXCHANGED = 'EXCHANGED',
}

export interface IResonance {
  id: string;
  userId: string;
  matchedUserId: string;
  revealStatus: ResonanceRevealStatus;
  songExchangeState: SongExchangeState;
  lastActivityAt: Date;
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
type IResonanceDocumentFields = Omit<IResonance, 'id' | 'createdAt' | 'updatedAt'>;

export interface IResonanceDocument extends IResonanceDocumentFields, Document {}

const ResonanceSchema = new Schema<IResonanceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    matchedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    revealStatus: {
      type: String,
      enum: Object.values(ResonanceRevealStatus),
      default: ResonanceRevealStatus.PENDING,
    },
    songExchangeState: {
      type: String,
      enum: Object.values(SongExchangeState),
      default: SongExchangeState.NONE,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

ResonanceSchema.index({ userA: 1 });
ResonanceSchema.index({ userB: 1 });

const Resonance = mongoose.model<IResonanceDocument>('Resonance', ResonanceSchema);
ResonanceSchema.index({ userId: 1, lastActivityAt: -1 });

const Resonance = mongoose.model<IResonanceDocument>('Resonance', ResonanceSchema);

export default Resonance;
