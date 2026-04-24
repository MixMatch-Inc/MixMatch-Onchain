import { IRepository } from './types';

export interface IBooking {
  id: string;
  planner: string;
  dj: string;
  eventType: string;
  eventDate: Date;
  budget: number;
  notes?: string;
  status: string;
  paymentStatus: string;
  responseNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookingRepository extends IRepository<IBooking, string> {
  findByPlanner(plannerId: string): Promise<IBooking[]>;
  findByDj(djId: string): Promise<IBooking[]>;
}
