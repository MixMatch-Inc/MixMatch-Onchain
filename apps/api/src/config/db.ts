import mongoose from 'mongoose';
import { apiEnv } from './env';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(apiEnv.mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;
