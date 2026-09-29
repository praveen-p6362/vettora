import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env';

// Force Node.js to use Google DNS.
// This fixes MongoDB Atlas SRV lookup failures such as:
// querySrv ECONNREFUSED _mongodb._tcp.cluster0.npf22uo.mongodb.net
dns.setServers(['8.8.8.8', '8.8.4.4']);

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  try {
    console.log('[db] Resolving MongoDB Atlas DNS...');

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    console.log('[db] Connected to MongoDB');
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err);
    process.exit(1);
  }
}