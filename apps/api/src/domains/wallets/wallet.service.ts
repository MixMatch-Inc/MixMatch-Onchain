import { Types } from 'mongoose';
import { WalletLinkage, WalletLinkageHistory, IWalletLinkageDocument } from './wallet-linkage.model';
import { 
  StellarNetwork, 
  WalletLinkageStatus, 
  KeyProvenance, 
  FeatureEligibility,
  CreateWalletLinkageDto,
  UpdateWalletLinkageDto,
  VerifyWalletLinkageDto,
  IWalletLinkage,
  IWalletLinkageHistory
} from '@mixmatch/types';

export class WalletService {
  /**
   * Create a new wallet linkage for a user
   */
  async createWalletLinkage(
    userId: string, 
    createDto: CreateWalletLinkageDto,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<IWalletLinkage> {
    // Check if wallet is already linked for this network
    const existingLinkage = await WalletLinkage.findOne({
      userId: new Types.ObjectId(userId),
      stellarAccountId: createDto.stellarAccountId,
      network: createDto.network,
    });

    if (existingLinkage) {
      throw new Error('Wallet is already linked to this account');
    }

    // Check if user has too many active wallets (security measure)
    const activeWalletCount = await WalletLinkage.countDocuments({
      userId: new Types.ObjectId(userId),
      status: { $in: [WalletLinkageStatus.ACTIVE, WalletLinkageStatus.PENDING_VERIFICATION] },
    });

    if (activeWalletCount >= 5) {
      throw new Error('Maximum number of active wallets reached');
    }

    // Create new wallet linkage
    const walletLinkage = new WalletLinkage({
      userId: new Types.ObjectId(userId),
      stellarAccountId: createDto.stellarAccountId,
      network: createDto.network,
      status: createDto.verificationSignature ? WalletLinkageStatus.ACTIVE : WalletLinkageStatus.PENDING_VERIFICATION,
      keyProvenance: createDto.keyProvenance,
      featureEligibility: this.getDefaultFeatureEligibility(createDto.keyProvenance),
      verificationSignature: createDto.verificationSignature,
      verifiedAt: createDto.verificationSignature ? new Date() : undefined,
      metadata: createDto.metadata || {},
    });

    const savedLinkage = await walletLinkage.save();

    // Record history
    await this.recordHistory(savedLinkage._id.toString(), userId, 'LINKED', {
      action: 'LINKED',
      stellarAccountId: createDto.stellarAccountId,
      network: createDto.network,
      keyProvenance: createDto.keyProvenance,
    }, context);

    return this.formatWalletLinkage(savedLinkage);
  }

  /**
   * Verify a wallet linkage
   */
  async verifyWalletLinkage(
    userId: string,
    walletLinkageId: string,
    verifyDto: VerifyWalletLinkageDto,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<IWalletLinkage> {
    const walletLinkage = await WalletLinkage.findOne({
      _id: new Types.ObjectId(walletLinkageId),
      userId: new Types.ObjectId(userId),
    });

    if (!walletLinkage) {
      throw new Error('Wallet linkage not found');
    }

    if (walletLinkage.status === WalletLinkageStatus.ACTIVE) {
      throw new Error('Wallet is already verified');
    }

    // In a real implementation, you would verify the signature here
    // For now, we'll assume the signature is valid
    const previousState = this.formatWalletLinkage(walletLinkage);

    walletLinkage.status = WalletLinkageStatus.ACTIVE;
    walletLinkage.verificationSignature = verifyDto.verificationSignature;
    walletLinkage.verifiedAt = new Date();

    const savedLinkage = await walletLinkage.save();

    // Record history
    await this.recordHistory(walletLinkageId, userId, 'VERIFIED', {
      previousState,
      newState: this.formatWalletLinkage(savedLinkage),
    }, context);

    return this.formatWalletLinkage(savedLinkage);
  }

  /**
   * Update wallet linkage
   */
  async updateWalletLinkage(
    userId: string,
    walletLinkageId: string,
    updateDto: UpdateWalletLinkageDto,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<IWalletLinkage> {
    const walletLinkage = await WalletLinkage.findOne({
      _id: new Types.ObjectId(walletLinkageId),
      userId: new Types.ObjectId(userId),
    });

    if (!walletLinkage) {
      throw new Error('Wallet linkage not found');
    }

    const previousState = this.formatWalletLinkage(walletLinkage);

    if (updateDto.status !== undefined) {
      walletLinkage.status = updateDto.status;
      
      if (updateDto.status === WalletLinkageStatus.DISCONNECTED) {
        walletLinkage.disconnectedAt = new Date();
        walletLinkage.disconnectReason = updateDto.metadata?.disconnectReason || 'User requested disconnection';
      }
    }

    if (updateDto.featureEligibility !== undefined) {
      walletLinkage.featureEligibility = updateDto.featureEligibility;
    }

    if (updateDto.metadata !== undefined) {
      walletLinkage.metadata = { ...walletLinkage.metadata, ...updateDto.metadata };
    }

    const savedLinkage = await walletLinkage.save();

    // Record history
    const action = updateDto.status === WalletLinkageStatus.DISCONNECTED ? 'DISCONNECTED' : 'DISABLED';
    await this.recordHistory(walletLinkageId, userId, action, {
      previousState,
      newState: this.formatWalletLinkage(savedLinkage),
    }, context);

    return this.formatWalletLinkage(savedLinkage);
  }

  /**
   * Get wallet linkages for a user
   */
  async getUserWalletLinkages(
    userId: string,
    status?: WalletLinkageStatus,
    network?: StellarNetwork
  ): Promise<IWalletLinkage[]> {
    const query: any = { userId: new Types.ObjectId(userId) };
    
    if (status) {
      query.status = status;
    }
    
    if (network) {
      query.network = network;
    }

    const linkages = await WalletLinkage.find(query).sort({ createdAt: -1 });
    return linkages.map(linkage => this.formatWalletLinkage(linkage));
  }

  /**
   * Get wallet linkage by ID
   */
  async getWalletLinkageById(userId: string, walletLinkageId: string): Promise<IWalletLinkage | null> {
    const linkage = await WalletLinkage.findOne({
      _id: new Types.ObjectId(walletLinkageId),
      userId: new Types.ObjectId(userId),
    });

    return linkage ? this.formatWalletLinkage(linkage) : null;
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(walletLinkageId: string): Promise<void> {
    await WalletLinkage.updateOne(
      { _id: new Types.ObjectId(walletLinkageId) },
      { lastUsedAt: new Date() }
    );
  }

  /**
   * Get wallet linkage history
   */
  async getWalletLinkageHistory(
    userId: string,
    walletLinkageId: string,
    limit: number = 50
  ): Promise<IWalletLinkageHistory[]> {
    const history = await WalletLinkageHistory.find({
      walletLinkageId: new Types.ObjectId(walletLinkageId),
      userId: new Types.ObjectId(userId),
    })
    .sort({ createdAt: -1 })
    .limit(limit);

    return history.map(h => ({
      id: h._id.toString(),
      walletLinkageId: h.walletLinkageId.toString(),
      userId: h.userId.toString(),
      action: h.action,
      previousState: h.previousState,
      newState: h.newState,
      reason: h.reason,
      ipAddress: h.ipAddress,
      userAgent: h.userAgent,
      createdAt: h.createdAt,
    }));
  }

  /**
   * Get default feature eligibility based on key provenance
   */
  private getDefaultFeatureEligibility(keyProvenance: KeyProvenance): FeatureEligibility[] {
    const baseFeatures = [FeatureEligibility.MICRO_ACTIONS];
    
    switch (keyProvenance) {
      case KeyProvenance.USER_GENERATED:
      case KeyProvenance.HARDWARE_WALLET:
        return [...baseFeatures, FeatureEligibility.PAYMENTS, FeatureEligibility.GOVERNANCE];
      case KeyProvenance.DERIVED_FROM_SEED:
        return [...baseFeatures, FeatureEligibility.PAYMENTS];
      case KeyProvenance.SOCIAL_RECOVERY:
        return [...baseFeatures, FeatureEligibility.GOVERNANCE];
      case KeyProvenance.EXCHANGE_WALLET:
        return baseFeatures; // Limited features for exchange wallets
      default:
        return baseFeatures;
    }
  }

  /**
   * Record wallet linkage history
   */
  private async recordHistory(
    walletLinkageId: string,
    userId: string,
    action: 'LINKED' | 'VERIFIED' | 'DISABLED' | 'DISCONNECTED' | 'RELINKED',
    data?: {
      previousState?: any;
      newState?: any;
      stellarAccountId?: string;
      network?: StellarNetwork;
      keyProvenance?: KeyProvenance;
    },
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const history = new WalletLinkageHistory({
      walletLinkageId: new Types.ObjectId(walletLinkageId),
      userId: new Types.ObjectId(userId),
      action,
      previousState: data?.previousState,
      newState: data?.newState,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    await history.save();
  }

  /**
   * Format wallet linkage for API response
   */
  private formatWalletLinkage(linkage: IWalletLinkageDocument): IWalletLinkage {
    return {
      id: linkage._id.toString(),
      userId: linkage.userId.toString(),
      stellarAccountId: linkage.stellarAccountId,
      network: linkage.network,
      status: linkage.status,
      keyProvenance: linkage.keyProvenance,
      featureEligibility: linkage.featureEligibility,
      verifiedAt: linkage.verifiedAt,
      lastUsedAt: linkage.lastUsedAt,
      disconnectReason: linkage.disconnectReason,
      disconnectedAt: linkage.disconnectedAt,
      metadata: linkage.metadata,
      createdAt: linkage.createdAt,
      updatedAt: linkage.updatedAt,
    };
  }
}
