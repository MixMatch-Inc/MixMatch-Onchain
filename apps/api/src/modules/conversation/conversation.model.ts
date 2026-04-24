import mongoose, { Document, Schema } from 'mongoose';

export enum ThreadPhase {
  MUSIC_ONLY = 'MUSIC_ONLY',
  TEXT_UNLOCKED = 'TEXT_UNLOCKED',
}

export enum MessageType {
  TRACK_SHARE = 'TRACK_SHARE',
  REACTION = 'REACTION',
  UNLOCK_EVENT = 'UNLOCK_EVENT',
  TEXT = 'TEXT',
  ATTACHMENT = 'ATTACHMENT',
}

export interface IParticipantReadState {
  participant: mongoose.Types.ObjectId;
  lastReadAt: Date;
}

export interface IMessage {
  _id?: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: MessageType;
  body?: string;
  trackRef?: string;       // external track ID / URI
  reactionEmoji?: string;
  attachmentUrl?: string;
  moderationFlagged: boolean;
  createdAt: Date;
}

export interface IConversationDocument extends Document {
  resonance: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  phase: ThreadPhase;
  messages: IMessage[];
  readState: IParticipantReadState[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(MessageType), required: true },
    body: { type: String, trim: true, maxlength: 4000 },
    trackRef: { type: String, trim: true },
    reactionEmoji: { type: String, trim: true, maxlength: 10 },
    attachmentUrl: { type: String, trim: true },
    moderationFlagged: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: true },
);

const ParticipantReadStateSchema = new Schema<IParticipantReadState>(
  {
    participant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastReadAt: { type: Date, required: true },
  },
  { _id: false },
);

const ConversationSchema = new Schema<IConversationDocument>(
  {
    resonance: {
      type: Schema.Types.ObjectId,
      ref: 'Resonance',
      required: true,
      unique: true,
      immutable: true,
    },
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: {
        validator: (v: mongoose.Types.ObjectId[]) => v.length === 2,
        message: 'A conversation must have exactly 2 participants',
      },
    },
    phase: {
      type: String,
      enum: Object.values(ThreadPhase),
      default: ThreadPhase.MUSIC_ONLY,
      index: true,
    },
    messages: { type: [MessageSchema], default: [] },
    readState: { type: [ParticipantReadStateSchema], default: [] },
  },
  { timestamps: true },
);

// Guard: text messages are only allowed when phase is TEXT_UNLOCKED
ConversationSchema.pre('save', function (next) {
  if (this.isModified('messages')) {
    const hasIllegalText = this.messages.some(
      (m) => m.type === MessageType.TEXT && this.phase === ThreadPhase.MUSIC_ONLY,
    );
    if (hasIllegalText) {
      return next(new Error('Text messages are not allowed before text unlock'));
    }
  }
  next();
});

ConversationSchema.index({ participants: 1, phase: 1 });

const Conversation = mongoose.model<IConversationDocument>('Conversation', ConversationSchema);
export default Conversation;
