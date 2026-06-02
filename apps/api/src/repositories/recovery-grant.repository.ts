export interface RecoveryGrantRecord {
  recoveryToken: string;
  subject: string;
  purpose: "account_recovery" | "session_recovery";
  proofId: string;
  expiresAt: string;
  consumedAt?: string;
}

const grants = new Map<string, RecoveryGrantRecord>();

export const recoveryGrantRepository = {
  async save(record: RecoveryGrantRecord): Promise<void> {
    grants.set(record.recoveryToken, record);
  },

  async findByToken(recoveryToken: string): Promise<RecoveryGrantRecord | null> {
    return grants.get(recoveryToken) ?? null;
  },

  async markConsumed(recoveryToken: string, consumedAt: string): Promise<void> {
    const record = grants.get(recoveryToken);
    if (!record) return;
    grants.set(recoveryToken, { ...record, consumedAt });
  },
};
