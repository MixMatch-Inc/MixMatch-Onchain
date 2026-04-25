export interface IBlocklistRepository {
  /** Block a user. Idempotent. */
  block(blockerId: string, blockedId: string, reason?: string): Promise<void>;
  /** Remove a block. */
  unblock(blockerId: string, blockedId: string): Promise<void>;
  /** True if blocker has blocked blocked. */
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  /** True if either party has blocked the other (mutual exclusion). */
  isMutuallyExcluded(userA: string, userB: string): Promise<boolean>;
  /** All user IDs that userId has blocked. */
  getBlockedIds(userId: string): Promise<string[]>;
}
