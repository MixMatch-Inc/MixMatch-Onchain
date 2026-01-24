export enum UserRole {
  DJ = 'DJ',
  PLANNER = 'PLANNER',
  MUSIC_LOVER = 'MUSIC_LOVER',
  ADMIN = 'ADMIN',
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
