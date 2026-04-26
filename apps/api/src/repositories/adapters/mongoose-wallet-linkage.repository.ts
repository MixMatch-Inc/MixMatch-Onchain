import { IWalletLinkage } from '@mixmatch/types';
import { IWalletLinkageRepository } from '../wallet-linkage.repository';
import { WalletLinkage } from '../../domains/wallets/wallet-linkage.model';

const mapToEntity = (doc: any): IWalletLinkage => ({
  id: String(doc._id),
  userId: String(doc.userId),
  stellarAccountId: doc.stellarAccountId,
  network: doc.network,
  status: doc.status,
  keyProvenance: doc.keyProvenance,
  featureEligibility: doc.featureEligibility,
  verifiedAt: doc.verifiedAt,
  lastUsedAt: doc.lastUsedAt,
  disconnectReason: doc.disconnectReason,
  disconnectedAt: doc.disconnectedAt,
  metadata: doc.metadata,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export class MongooseWalletLinkageRepository implements IWalletLinkageRepository {
  async findById(id: string): Promise<IWalletLinkage | null> {
    const doc = await WalletLinkage.findById(id).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async findAll(filter?: Partial<IWalletLinkage>): Promise<IWalletLinkage[]> {
    const docs = await WalletLinkage.find(filter).lean();
    return docs.map((doc) => mapToEntity(doc));
  }

  async create(data: Partial<IWalletLinkage>): Promise<IWalletLinkage> {
    const doc = await WalletLinkage.create(data);
    return mapToEntity(doc);
  }

  async update(id: string, data: Partial<IWalletLinkage>): Promise<IWalletLinkage | null> {
    const doc = await WalletLinkage.findByIdAndUpdate(id, data, { new: true }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await WalletLinkage.findByIdAndDelete(id);
    return result !== null;
  }

  async findByUserId(userId: string): Promise<IWalletLinkage[]> {
    const docs = await WalletLinkage.find({ userId }).lean();
    return docs.map((doc) => mapToEntity(doc));
  }
}
