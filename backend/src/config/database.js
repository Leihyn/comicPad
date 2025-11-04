import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Connect to MongoDB
 */
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;

export const connectDB = async () => {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    logger.info('Connection attempt already in progress...');
    return;
  }

  isConnecting = true;

  try {
    connectionAttempts++;
    logger.info(`MongoDB connection attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS}`);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 60000, // Increase to 60 seconds
      socketTimeoutMS: 75000, // Increase to 75 seconds
      connectTimeoutMS: 60000,
      family: 4, // Force IPv4
      maxPoolSize: 10, // Maximum connection pool size
      minPoolSize: 2, // Minimum connection pool size
      maxIdleTimeMS: 60000, // Close idle connections after 60 seconds
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 10000, // Check connection every 10 seconds
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database Name: ${conn.connection.name}`);
    connectionAttempts = 0; // Reset on success
    isConnecting = false;

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnecting = false;

      // Auto-reconnect after disconnect
      if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
        logger.info('Attempting to reconnect...');
        setTimeout(() => connectDB(), 5000);
      }
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
      connectionAttempts = 0;
    });

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    isConnecting = false;
    logger.error('MongoDB connection failed:', error.message);

    if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
      const retryDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000); // Exponential backoff, max 30s
      logger.info(`Retrying connection in ${retryDelay / 1000} seconds... (Attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS})`);

      setTimeout(async () => {
        await connectDB();
      }, retryDelay);
    } else {
      logger.error(`Failed to connect to MongoDB after ${MAX_RETRY_ATTEMPTS} attempts`);
      logger.error('Please check:');
      logger.error('1. MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)');
      logger.error('2. Network connectivity and DNS resolution');
      logger.error('3. MongoDB Atlas cluster is running (not paused)');
      logger.error('4. Connection string is correct');
    }
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
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