import mongoose, { Document, Schema } from 'mongoose';

export enum ResonanceState {
  PENDING_LIKE = 'PENDING_LIKE',
  MUTUAL = 'MUTUAL',
  REVEAL_REQUESTED = 'REVEAL_REQUESTED',
  REVEALED = 'REVEALED',
  TEXT_UNLOCKED = 'TEXT_UNLOCKED',
  ARCHIVED = 'ARCHIVED',
  BLOCKED = 'BLOCKED',
}

export enum ResonanceSurface {
  DISCOVERY = 'DISCOVERY',
  CHEMISTRY_EVENT = 'CHEMISTRY_EVENT',
  SHARED_FREQUENCY = 'SHARED_FREQUENCY',
}

export enum LikeOrigin {
  EARLY = 'EARLY',
  FULL_JOURNEY = 'FULL_JOURNEY',
}

// Valid state transitions
const VALID_TRANSITIONS: Record<ResonanceState, ResonanceState[]> = {
  [ResonanceState.PENDING_LIKE]: [ResonanceState.MUTUAL, ResonanceState.ARCHIVED],
  [ResonanceState.MUTUAL]: [ResonanceState.REVEAL_REQUESTED, ResonanceState.ARCHIVED],
  [ResonanceState.REVEAL_REQUESTED]: [ResonanceState.REVEALED, ResonanceState.ARCHIVED],
  [ResonanceState.REVEALED]: [ResonanceState.TEXT_UNLOCKED, ResonanceState.ARCHIVED],
  [ResonanceState.TEXT_UNLOCKED]: [ResonanceState.ARCHIVED, ResonanceState.BLOCKED],
  [ResonanceState.ARCHIVED]: [],
  [ResonanceState.BLOCKED]: [],
};

export function isValidTransition(from: ResonanceState, to: ResonanceState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface IResonanceDocument extends Document {
  initiator: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  state: ResonanceState;
  surface: ResonanceSurface;
  likeOrigin: LikeOrigin;
  mutualAt?: Date;
  revealRequestedAt?: Date;
  revealedAt?: Date;
  firstSongExchanged: boolean;
  textUnlockedAt?: Date;
  archivedAt?: Date;
  blockedAt?: Date;
  blockedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ResonanceSchema = new Schema<IResonanceDocument>(
  {
    initiator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    state: {
      type: String,
      enum: Object.values(ResonanceState),
      default: ResonanceState.PENDING_LIKE,
      index: true,
    },
    surface: {
      type: String,
      enum: Object.values(ResonanceSurface),
      required: true,
      immutable: true,
    },
    likeOrigin: {
      type: String,
      enum: Object.values(LikeOrigin),
      required: true,
      immutable: true,
    },
    mutualAt: { type: Date },
    revealRequestedAt: { type: Date },
    revealedAt: { type: Date },
    firstSongExchanged: { type: Boolean, default: false },
    textUnlockedAt: { type: Date },
    archivedAt: { type: Date },
    blockedAt: { type: Date },
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Unique pair constraint (one resonance per user pair)
ResonanceSchema.index({ initiator: 1, recipient: 1 }, { unique: true });
// Mutual resonance lookup (index-backed per acceptance criteria)
ResonanceSchema.index({ state: 1, mutualAt: -1 });
ResonanceSchema.index({ initiator: 1, state: 1 });
ResonanceSchema.index({ recipient: 1, state: 1 });

const Resonance = mongoose.model<IResonanceDocument>('Resonance', ResonanceSchema);
export default Resonance;
