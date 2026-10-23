import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) throw new Error("MONGODB_URI is required.");

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalWithMongoose = global as typeof globalThis & { mongoose?: MongooseCache };
const cached = globalWithMongoose.mongoose ?? { conn: null, promise: null };
globalWithMongoose.mongoose = cached;

export async function connectToDatabase() {
  if (!uri) throw new Error("MONGODB_URI is required.");
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
  cached.conn = await cached.promise;
  return cached.conn;
}
