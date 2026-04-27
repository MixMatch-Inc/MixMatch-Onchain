import { IPasswordResetToken } from '@mixmatch/types';
import { IPasswordResetTokenRepository } from '../password-reset-token.repository';
import PasswordResetToken from '../../domains/identity/password-reset-token.model';

const mapToEntity = (doc: any): IPasswordResetToken => ({
  id: String(doc._id),
  userId: String(doc.userId),
  tokenHash: doc.tokenHash,
  expiresAt: doc.expiresAt,
  consumedAt: doc.consumedAt ?? undefined,
  requestIp: doc.requestIp ?? undefined,
  userAgent: doc.userAgent ?? undefined,
  createdAt: doc.createdAt,
});

export class MongoosePasswordResetTokenRepository
  implements IPasswordResetTokenRepository
{
  async create(
    data: Omit<IPasswordResetToken, 'id' | 'createdAt'>,
  ): Promise<IPasswordResetToken> {
    const doc = await PasswordResetToken.create(data);
    return mapToEntity(doc);
  }

  async findActiveByUserId(userId: string): Promise<IPasswordResetToken | null> {
    const now = new Date();
    const doc = await PasswordResetToken.findOne({
      userId,
      consumedAt: { $exists: false },
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    return doc ? mapToEntity(doc) : null;
  }

  async findByTokenHash(hash: string): Promise<IPasswordResetToken | null> {
    const doc = await PasswordResetToken.findOne({ tokenHash: hash }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async markConsumed(id: string): Promise<void> {
    await PasswordResetToken.findByIdAndUpdate(id, {
      $set: { consumedAt: new Date() },
    });
  }

  async supersedePriorTokens(userId: string): Promise<number> {
    const now = new Date();
    const result = await PasswordResetToken.updateMany(
      {
        userId,
        consumedAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      { $set: { consumedAt: now } },
    );
    return result.modifiedCount;
  }

  async countRecentByUserId(userId: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return PasswordResetToken.countDocuments({
      userId,
      createdAt: { $gte: since },
    });
  }
}
