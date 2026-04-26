import { IEmailVerificationToken } from '@mixmatch/types';
import { IEmailVerificationTokenRepository } from '../email-verification-token.repository';
import EmailVerificationToken from '../../domains/identity/email-verification-token.model';

const mapToEntity = (doc: any): IEmailVerificationToken => ({
  id: String(doc._id),
  userId: String(doc.userId),
  tokenHash: doc.tokenHash,
  expiresAt: doc.expiresAt,
  consumedAt: doc.consumedAt ?? undefined,
  supersededAt: doc.supersededAt ?? undefined,
  resendLineage: doc.resendLineage ?? undefined,
  resendCount: doc.resendCount,
  ipAddress: doc.ipAddress ?? undefined,
  userAgent: doc.userAgent ?? undefined,
  createdAt: doc.createdAt,
});

export class MongooseEmailVerificationTokenRepository
  implements IEmailVerificationTokenRepository
{
  async create(
    data: Omit<IEmailVerificationToken, 'id' | 'createdAt'>,
  ): Promise<IEmailVerificationToken> {
    const doc = await EmailVerificationToken.create(data);
    return mapToEntity(doc);
  }

  async findActiveByUserId(userId: string): Promise<IEmailVerificationToken | null> {
    const now = new Date();
    const doc = await EmailVerificationToken.findOne({
      userId,
      consumedAt: { $exists: false },
      supersededAt: { $exists: false },
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    return doc ? mapToEntity(doc) : null;
  }

  async findByTokenHash(hash: string): Promise<IEmailVerificationToken | null> {
    const doc = await EmailVerificationToken.findOne({ tokenHash: hash }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async markConsumed(id: string): Promise<void> {
    await EmailVerificationToken.findByIdAndUpdate(id, {
      $set: { consumedAt: new Date() },
    });
  }

  async supersedePriorTokens(userId: string, exceptId: string): Promise<number> {
    const now = new Date();
    const result = await EmailVerificationToken.updateMany(
      {
        userId,
        _id: { $ne: exceptId },
        consumedAt: { $exists: false },
        supersededAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      { $set: { supersededAt: now } },
    );
    return result.modifiedCount;
  }

  async countRecentByUserId(userId: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return EmailVerificationToken.countDocuments({
      userId,
      createdAt: { $gte: since },
    });
  }
}
