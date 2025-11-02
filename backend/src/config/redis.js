import Redis from 'redis';
import logger from '../utils/logger.js';

let redisClient = null;

/**
 * Initialize Redis client
 */
export const connectRedis = async () => {
  try {
    if (!process.env.REDIS_URL) {
      logger.warn('Redis URL not configured, running without cache');
      return null;
    }

    redisClient = Redis.createClient({
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Too many reconnection attempts');
            return new Error('Too many reconnection attempts');
          }
          return retries * 100; // Exponential backoff
        }
      }
    });

    // Event handlers
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    redisClient.on('end', () => {
      logger.warn('Redis client connection closed');
    });

    // Connect
    await redisClient.connect();

    // Test connection
    await redisClient.ping();
    logger.info('Redis connected successfully');

    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    return null;
  }
};

/**
 * Get Redis client instance
 */
export const getRedisClient = () => {
  return redisClient;
};

/**
 * Set cache with expiration
 */
export const setCache = async (key, value, expirationInSeconds = 3600) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }

    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.setEx(key, expirationInSeconds, serialized);
    return true;
  } catch (error) {
    logger.error('Redis SET error:', error);
    return false;
  }
};

/**
 * Get cache value
 */
export const getCache = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return null;
    }

    const value = await redisClient.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    logger.error('Redis GET error:', error);
    return null;
  }
};

/**
 * Delete cache key
 */
export const deleteCache = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }

    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Redis DEL error:', error);
    return false;
  }
};

/**
 * Delete cache keys by pattern
 */
export const deleteCachePattern = async (pattern) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    logger.error('Redis DEL pattern error:', error);
    return false;
  }
};

/**
 * Check if key exists
 */
export const exists = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }

    const result = await redisClient.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Redis EXISTS error:', error);
    return false;
  }
};

/**
 * Increment counter
 */
export const increment = async (key, amount = 1) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return null;
    }

    const result = await redisClient.incrBy(key, amount);
    return result;
  } catch (error) {
    logger.error('Redis INCR error:', error);
    return null;
  }
};

/**
 * Set expiration on existing key
 */
export const expire = async (key, seconds) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }

    await redisClient.expire(key, seconds);
    return true;
  } catch (error) {
    logger.error('Redis EXPIRE error:', error);
    return false;
  }
};

/**
 * Get time to live for key
 */
export const ttl = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return -1;
    }

    const result = await redisClient.ttl(key);
    return result;
  } catch (error) {
    logger.error('Redis TTL error:', error);
    return -1;
  }
};

/**
 * Disconnect Redis
 */
export const disconnectRedis = async () => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting Redis:', error);
  }
};

/**
 * Check Redis connection status
 */
export const checkRedisConnection = () => {
  return {
    isConnected: redisClient ? redisClient.isOpen : false,
    isReady: redisClient ? redisClient.isReady : false
  };
};

export default {
  connectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  exists,
  increment,
  expire,
  ttl,
  disconnectRedis,
  checkRedisConnection
};