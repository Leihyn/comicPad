import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Connect to MongoDB
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // Increased from 5000
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    logger.info('Retrying connection in 5 seconds...');

    // Retry connection after 5 seconds
    setTimeout(async () => {
      await connectDB();
    }, 5000);
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