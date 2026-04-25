import mongoose, { Document, Schema } from 'mongoose';

export enum EventVariant {
  LIVE = 'LIVE',
  ASYNC = 'ASYNC',
}

export enum ChemistryEventStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ParticipationState {
  JOINED = 'JOINED',
  LEFT = 'LEFT',
  COMPLETED = 'COMPLETED',
  REMOVED = 'REMOVED',
}

export enum PoolSegment {
  GENERAL = 'GENERAL',
  VIP = 'VIP',
  EARLY_ACCESS = 'EARLY_ACCESS',
}

export interface IParticipant {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  segment: PoolSegment;
  state: ParticipationState;
  joinedAt: Date;
  leftAt?: Date;
  progressionScore?: number;
}

export interface IChemistryEventDocument extends Document {
  title: string;
  theme: string;
  variant: EventVariant;
  status: ChemistryEventStatus;
  windowStart: Date;
  windowEnd: Date;
  capacityLimit?: number;
  entryConstraints: string[];
  poolSegmentRules: string[];
  moderationFlagged: boolean;
  participants: IParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    segment: {
      type: String,
      enum: Object.values(PoolSegment),
      default: PoolSegment.GENERAL,
    },
    state: {
      type: String,
      enum: Object.values(ParticipationState),
      default: ParticipationState.JOINED,
    },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    progressionScore: { type: Number, min: 0 },
  },
  { _id: true },
);

const ChemistryEventSchema = new Schema<IChemistryEventDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    theme: { type: String, required: true, trim: true, maxlength: 200 },
    variant: {
      type: String,
      enum: Object.values(EventVariant),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ChemistryEventStatus),
      default: ChemistryEventStatus.SCHEDULED,
      index: true,
    },
    windowStart: { type: Date, required: true, index: true },
    windowEnd: { type: Date, required: true, index: true },
    capacityLimit: { type: Number, min: 1 },
    entryConstraints: { type: [String], default: [] },
    poolSegmentRules: { type: [String], default: [] },
    moderationFlagged: { type: Boolean, default: false, index: true },
    participants: { type: [ParticipantSchema], default: [] },
  },
  { timestamps: true },
);

// Active-event lookup (index-backed per acceptance criteria)
ChemistryEventSchema.index({ status: 1, windowStart: 1, windowEnd: 1 });
// Participant lookup across events
ChemistryEventSchema.index({ 'participants.user': 1, 'participants.state': 1 });

const ChemistryEvent = mongoose.model<IChemistryEventDocument>(
  'ChemistryEvent',
  ChemistryEventSchema,
);
export default ChemistryEvent;
