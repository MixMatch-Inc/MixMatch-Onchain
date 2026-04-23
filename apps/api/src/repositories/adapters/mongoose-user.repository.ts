import { IUser, IUserRepository } from '../user.repository';
import User from '../../domains/identity/user.model';

const mapToEntity = (doc: any): IUser => ({
  id: String(doc._id),
  name: doc.name,
  email: doc.email,
  passwordHash: doc.passwordHash,
  role: doc.role,
  onboardingCompleted: doc.onboardingCompleted,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export class MongooseUserRepository implements IUserRepository {
  async findById(id: string): Promise<IUser | null> {
    const doc = await User.findById(id).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async findAll(filter?: Partial<IUser>): Promise<IUser[]> {
    const docs = await User.find(filter).lean();
    return docs.map((doc) => mapToEntity(doc));
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    const doc = await User.create(data);
    return mapToEntity(doc);
  }

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    const doc = await User.findByIdAndUpdate(id, data, { new: true }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return result !== null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const doc = await User.findOne({ email }).lean();
    return doc ? mapToEntity(doc) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await User.countDocuments({ email });
    return count > 0;
  }
}
