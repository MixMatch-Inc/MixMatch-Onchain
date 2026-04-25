import { Types } from 'mongoose';
import { BlockEntry } from '../../domains/moderation/block-entry.model';
import { IBlocklistRepository } from '../blocklist.repository';

export class MongooseBlocklistRepository implements IBlocklistRepository {
  async block(blockerId: string, blockedId: string, reason?: string): Promise<void> {
    await BlockEntry.updateOne(
      { blocker: new Types.ObjectId(blockerId), blocked: new Types.ObjectId(blockedId) },
      { $setOnInsert: { blocker: new Types.ObjectId(blockerId), blocked: new Types.ObjectId(blockedId), reason } },
      { upsert: true },
    );
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await BlockEntry.deleteOne({
      blocker: new Types.ObjectId(blockerId),
      blocked: new Types.ObjectId(blockedId),
    });
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const count = await BlockEntry.countDocuments({
      blocker: new Types.ObjectId(blockerId),
      blocked: new Types.ObjectId(blockedId),
    });
    return count > 0;
  }

  async isMutuallyExcluded(userA: string, userB: string): Promise<boolean> {
    const count = await BlockEntry.countDocuments({
      $or: [
        { blocker: new Types.ObjectId(userA), blocked: new Types.ObjectId(userB) },
        { blocker: new Types.ObjectId(userB), blocked: new Types.ObjectId(userA) },
      ],
    });
    return count > 0;
  }

  async getBlockedIds(userId: string): Promise<string[]> {
    const entries = await BlockEntry.find({ blocker: new Types.ObjectId(userId) }, { blocked: 1 }).lean();
    return entries.map((e) => e.blocked.toString());
  }
}
