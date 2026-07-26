export interface Property {
  id: string;
  name: string;
  description: string | null;
  type: string;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
}
