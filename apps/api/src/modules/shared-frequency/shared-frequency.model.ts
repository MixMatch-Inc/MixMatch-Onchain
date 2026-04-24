import mongoose, { Document, Schema } from 'mongoose';

export enum PlaylistStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum TrackProvenance {
  ADDED = 'ADDED',
  REORDERED = 'REORDERED',
  PINNED = 'PINNED',
  REMOVED = 'REMOVED',
}

export enum SyncStatus {
  UNSYNCED = 'UNSYNCED',
  SYNCED = 'SYNCED',
  SYNC_ERROR = 'SYNC_ERROR',
}

export interface ITrackEntry {
  _id?: mongoose.Types.ObjectId;
  trackRef: string;       // external provider track ID / URI
  provider: string;       // e.g. 'spotify', 'soundcloud'
  addedBy: mongoose.Types.ObjectId;
  position: number;
  isPinnedMilestone: boolean;
  addedAt: Date;
}

export interface IHistoryEvent {
  _id?: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId;
  action: TrackProvenance;
  trackRef: string;
  position?: number;
  occurredAt: Date;
}

export interface ISharedFrequencyDocument extends Document {
  resonance: mongoose.Types.ObjectId;
  contributors: mongoose.Types.ObjectId[];
  tracks: ITrackEntry[];
  history: IHistoryEvent[];
  status: PlaylistStatus;
  syncStatus: SyncStatus;
  externalPlaylistId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrackEntrySchema = new Schema<ITrackEntry>(
  {
    trackRef: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    position: { type: Number, required: true, min: 0 },
    isPinnedMilestone: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const HistoryEventSchema = new Schema<IHistoryEvent>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: Object.values(TrackProvenance), required: true },
    trackRef: { type: String, required: true, trim: true },
    position: { type: Number },
    occurredAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const SharedFrequencySchema = new Schema<ISharedFrequencyDocument>(
  {
    resonance: {
      type: Schema.Types.ObjectId,
      ref: 'Resonance',
      required: true,
      unique: true,   // one playlist per resonance
      immutable: true,
    },
    contributors: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    tracks: { type: [TrackEntrySchema], default: [] },
    history: { type: [HistoryEventSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(PlaylistStatus),
      default: PlaylistStatus.ACTIVE,
      index: true,
    },
    syncStatus: {
      type: String,
      enum: Object.values(SyncStatus),
      default: SyncStatus.UNSYNCED,
    },
    externalPlaylistId: { type: String, trim: true },
  },
  { timestamps: true },
);

SharedFrequencySchema.index({ contributors: 1, status: 1 });

const SharedFrequency = mongoose.model<ISharedFrequencyDocument>(
  'SharedFrequency',
  SharedFrequencySchema,
);
export default SharedFrequency;
