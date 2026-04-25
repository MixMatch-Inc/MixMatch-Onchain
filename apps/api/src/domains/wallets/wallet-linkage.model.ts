import mongoose, { Schema, Document } from 'mongoose';
import { 
  StellarNetwork, 
  WalletLinkageStatus, 
  KeyProvenance, 
  FeatureEligibility,
  IWalletLinkage,
  IWalletLinkageHistory
} from '@mixmatch/types';

export interface IWalletLinkageDocument extends Document, Omit<IWalletLinkage, 'id'> {}

export interface IWalletLinkageHistoryDocument extends Document, Omit<IWalletLinkageHistory, 'id'> {}

const WalletLinkageSchema = new Schema<IWalletLinkageDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    stellarAccountId: {
      type: String,
      required: [true, 'Stellar account ID is required'],
      validate: {
        validator: (v: string) => /^G[A-Z0-9]{55}$/.test(v),
        message: 'Invalid Stellar account ID format',
      },
      index: true,
    },
    network: {
      type: String,
      enum: Object.values(StellarNetwork),
      required: [true, 'Network is required'],
    },
    status: {
      type: String,
      enum: Object.values(WalletLinkageStatus),
      default: WalletLinkageStatus.PENDING_VERIFICATION,
      index: true,
    },
    keyProvenance: {
      type: String,
      enum: Object.values(KeyProvenance),
      required: [true, 'Key provenance is required'],
    },
    featureEligibility: {
      type: [String],
      enum: Object.values(FeatureEligibility),
      default: [],
    },
    verificationSignature: {
      type: String,
      select: false, // Never include in queries by default for security
    },
    verifiedAt: {
      type: Date,
    },
    lastUsedAt: {
      type: Date,
    },
    disconnectReason: {
      type: String,
      maxlength: [500, 'Disconnect reason cannot exceed 500 characters'],
    },
    disconnectedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'wallet_linkages',
  },
);

// Compound indexes for efficient queries
WalletLinkageSchema.index({ userId: 1, status: 1 });
WalletLinkageSchema.index({ stellarAccountId: 1, network: 1 }, { unique: true });
WalletLinkageSchema.index({ status: 1, network: 1 });

// Middleware to update lastUsedAt when wallet is accessed
WalletLinkageSchema.pre(/^find/, function() {
  // For read operations, we might want to update lastUsedAt
  // This can be done in the service layer
});

const WalletLinkageHistorySchema = new Schema<IWalletLinkageHistoryDocument>(
  {
    walletLinkageId: {
      type: Schema.Types.ObjectId,
      ref: 'WalletLinkage',
      required: [true, 'Wallet linkage ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    action: {
      type: String,
      enum: ['LINKED', 'VERIFIED', 'DISABLED', 'DISCONNECTED', 'RELINKED'],
      required: [true, 'Action is required'],
    },
    previousState: {
      type: Schema.Types.Mixed,
    },
    newState: {
      type: Schema.Types.Mixed,
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'wallet_linkage_history',
  },
);

// Index for history queries
WalletLinkageHistorySchema.index({ walletLinkageId: 1, createdAt: -1 });
WalletLinkageHistorySchema.index({ userId: 1, createdAt: -1 });

export const WalletLinkage = mongoose.model<IWalletLinkageDocument>('WalletLinkage', WalletLinkageSchema);
export const WalletLinkageHistory = mongoose.model<IWalletLinkageHistoryDocument>('WalletLinkageHistory', WalletLinkageHistorySchema);
