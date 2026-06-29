export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
