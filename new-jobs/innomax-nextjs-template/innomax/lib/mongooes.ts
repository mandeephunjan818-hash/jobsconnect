// lib/mongodb.ts
import mongoose from 'mongoose';

declare global {
    var mongoose: {
        conn: any | null;
        promise: Promise<any> | null;
    };
}

const MONGODB_URI = process.env.MONGODB_URI as string;

console.log('MONGODB_URI:', MONGODB_URI);

if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI environment variable');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
    if (cached.conn) {
        console.log('Using cached MongoDB connection');
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            heartbeatFrequencyMS: 10000,
        };

        console.log('Connecting to MongoDB...');
        cached.promise = mongoose.connect(MONGODB_URI, opts);
    }
    cached.conn = await cached.promise;
    console.log('MongoDB connected successfully');
    return cached.conn;
}

export default connectToDatabase;