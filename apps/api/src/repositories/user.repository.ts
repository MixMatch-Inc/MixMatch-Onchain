import { UserRole } from "@themixmatch/types";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

let users: UserRecord[] = [];
let nextId = 1;

export const userRepository = {
  async existsByEmail(email: string): Promise<boolean> {
    return users.some(u => u.email === email);
  },

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    onboardingCompleted: boolean;
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
    return users.find(u => u.email === email) || null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    return users.find(u => u.id === id) || null;
  },
};
