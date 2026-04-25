import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

export async function startMongo(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
  await mongoose.connect(mongoServer.getUri());
}

export async function stopMongo(): Promise<void> {
  await mongoose.disconnect();
  await mongoServer.stop();
}

export async function clearCollections(...models: mongoose.Model<never>[]): Promise<void> {
  await Promise.all(models.map((m) => m.deleteMany({})));
}
