import mongoose from 'mongoose';
import dns from 'dns';
import { config } from '../config/env.js';

// Ensure Node can resolve MongoDB SRV records on all DNS networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if not permitted
}

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose | null> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!config.mongodbUri || config.mongodbUri.trim() === '') {
    console.warn('[MongoDB] No MONGODB_URI configured. Running with local verified knowledge base.');
    return null;
  }

  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      dbName: config.mongodbDbName,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`[MongoDB] Connected successfully to Atlas database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn('[MongoDB] Connection failed, falling back gracefully to local verified knowledge base:', error);
    isConnected = false;
    return null;
  }
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
