import mongoose, { Document, Schema } from 'mongoose';

export interface IBlockEntry {
  blocker: mongoose.Types.ObjectId;
  blocked: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

export interface IBlockEntryDocument extends IBlockEntry, Document {}

const BlockEntrySchema = new Schema<IBlockEntryDocument>(
  {
    blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

BlockEntrySchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export const BlockEntry = mongoose.model<IBlockEntryDocument>('BlockEntry', BlockEntrySchema);
