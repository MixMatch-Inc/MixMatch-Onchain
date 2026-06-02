import { UserRole } from "@themixmatch/types";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  onboardingCompleted: boolean;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

let users: UserRecord[] = [];
let nextId = 1;

export const userRepository = {
  async existsByEmail(email: string): Promise<boolean> {
    return users.some((u) => u.email === email);
  },

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    onboardingCompleted: boolean;
    emailVerifiedAt?: Date;
  }): Promise<UserRecord> {
    const user: UserRecord = {
      id: nextId.toString(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(user);
    nextId++;
    return user;
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    return users.find((u) => u.email === email) || null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    return users.find((u) => u.id === id) || null;
  },

  async markEmailVerified(
    email: string,
    verifiedAt: Date,
  ): Promise<UserRecord | null> {
    const normalizedEmail = email.toLowerCase();
    const user = users.find((u) => u.email === normalizedEmail);
    if (!user) return null;

    user.emailVerifiedAt = verifiedAt;
    user.updatedAt = verifiedAt;
    return user;
  },

  async updatePasswordByEmail(
    email: string,
    passwordHash: string,
  ): Promise<UserRecord | null> {
    const normalizedEmail = email.toLowerCase();
    const user = users.find((u) => u.email === normalizedEmail);
    if (!user) return null;

    user.passwordHash = passwordHash;
    user.updatedAt = new Date();
    return user;
  },
};
