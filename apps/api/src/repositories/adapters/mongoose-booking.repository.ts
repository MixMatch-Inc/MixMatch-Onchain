import { IBooking, IBookingRepository } from '../booking.repository';
import Booking from '../../domains/journeys/booking.model';

const mapToEntity = (doc: any): IBooking => ({
  id: String(doc._id),
  planner: String(doc.planner),
  dj: String(doc.dj),
  eventType: doc.eventType,
  eventDate: doc.eventDate,
  budget: doc.budget,
  notes: doc.notes,
  status: doc.status,
  paymentStatus: doc.paymentStatus,
  responseNote: doc.responseNote,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export class MongooseBookingRepository implements IBookingRepository {
  async findById(id: string): Promise<IBooking | null> {
    const doc = await Booking.findById(id).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async findAll(filter?: Partial<IBooking>): Promise<IBooking[]> {
    const docs = await Booking.find(filter).lean();
    return docs.map((doc) => mapToEntity(doc));
  }

  async create(data: Partial<IBooking>): Promise<IBooking> {
    const doc = await Booking.create(data);
    return mapToEntity(doc);
  }

  async update(id: string, data: Partial<IBooking>): Promise<IBooking | null> {
    const doc = await Booking.findByIdAndUpdate(id, data, { new: true }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Booking.findByIdAndDelete(id);
    return result !== null;
  }

  async findByPlanner(plannerId: string): Promise<IBooking[]> {
    const docs = await Booking.find({ planner: plannerId }).lean();
    return docs.map((doc) => mapToEntity(doc));
  }

  async findByDj(djId: string): Promise<IBooking[]> {
    const docs = await Booking.find({ dj: djId }).lean();
    return docs.map((doc) => mapToEntity(doc));
  }
}
