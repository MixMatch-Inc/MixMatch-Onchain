import type { OwnershipProofPurpose, OwnershipProofSubjectType } from "@themixmatch/types";

export interface OwnershipChallengeRecord {
  challengeId: string;
  subjectType: OwnershipProofSubjectType;
  subject: string;
  purpose: OwnershipProofPurpose;
  code: string;
  expiresAt: string;
  consumedAt?: string;
}

const challenges = new Map<string, OwnershipChallengeRecord>();

export const ownershipChallengeRepository = {
  async save(record: OwnershipChallengeRecord): Promise<void> {
    challenges.set(record.challengeId, record);
  },

  async findById(challengeId: string): Promise<OwnershipChallengeRecord | null> {
    return challenges.get(challengeId) ?? null;
  },

  async markConsumed(challengeId: string, consumedAt: string): Promise<void> {
    const record = challenges.get(challengeId);
    if (!record) return;
    challenges.set(challengeId, { ...record, consumedAt });
  },

  async delete(challengeId: string): Promise<void> {
    challenges.delete(challengeId);
  },
};
