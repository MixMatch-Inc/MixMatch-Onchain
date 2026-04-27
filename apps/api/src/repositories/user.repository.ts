import { IRepository } from './types';

export interface IUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  onboardingCompleted: boolean;
  accountStatus: string;
  moderationState: string;
  ageGatePassed: boolean;
  timezone: string;
  locale: string;
  visibilityPreference: string;
  privacySettings: any;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
  /** Last N password hashes for history enforcement */
  passwordHistory?: string[];
}

export interface IUserRepository extends IRepository<IUser, string> {
  findByEmail(email: string): Promise<IUser | null>;
  existsByEmail(email: string): Promise<boolean>;
  /** Fetches user including the passwordHistory field (normally excluded). */
  findByIdWithPasswordHistory(id: string): Promise<IUser | null>;
}
