import mongoose from 'mongoose';
import { apiEnv } from './env';
import { apiLogger } from './logger';

let connectionPromise: Promise<typeof mongoose> | null = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(apiEnv.mongoUri)
    .then((connection) => {
      apiLogger.info('MongoDB connected', {
        host: connection.connection.host,
      });
      return connection;
    })
    .catch((error: Error) => {
      connectionPromise = null;
      apiLogger.error('MongoDB connection failed', {
        error,
      });
      throw error;
    });

  return connectionPromise;
};

export default connectDB;
