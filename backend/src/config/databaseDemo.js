import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import logger from '../utils/logger.js';

let mongoServer;
let isConnecting = false;

/**
 * Connect to In-Memory MongoDB (Perfect for demos!)
 */
export const connectDB = async () => {
  if (isConnecting) {
    logger.info('Connection attempt already in progress...');
    return;
  }

  isConnecting = true;

  try {
    logger.info('🚀 Starting In-Memory MongoDB for DEMO...');

    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27017, // Use default MongoDB port
        dbName: 'hederaPadDB'
      }
    });

    const uri = mongoServer.getUri();
    logger.info(`📍 In-Memory MongoDB URI: ${uri}`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ In-Memory MongoDB Connected!`);
    logger.info(`📊 Database: ${conn.connection.name}`);
    logger.info(`🎬 DEMO MODE - Data will not persist after restart`);

    isConnecting = false;

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnecting = false;
    });

    return conn;
  } catch (error) {
    isConnecting = false;
    logger.error('In-Memory MongoDB startup failed:', error.message);
    throw error;
  }
};

/**
 * Disconnect and cleanup
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    logger.info('In-Memory MongoDB stopped');
  } catch (error) {
    logger.error('Error stopping In-Memory MongoDB:', error);
  }
};

/**
 * Check database connection status
 */
export const checkDBConnection = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return {
    status: states[state],
    isConnected: state === 1
  };
};

export default {
  connectDB,
  disconnectDB,
  checkDBConnection
};
