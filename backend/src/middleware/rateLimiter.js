import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'redis';
import logger from '../utils/logger.js';

// Create Redis client
let redisClient;
if (process.env.REDIS_URL) {
  try {
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis rate limiter error:', err);
    });
    
    redisClient.connect();
  } catch (error) {
    logger.error('Failed to create Redis client for rate limiting:', error);
  }
}

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'development' ? 1000 : 100)), // Higher limit for dev
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
  ...(redisClient && {
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:api:'
    })
  })
});

/**
 * Strict rate limiter for auth endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:auth:'
    })
  })
});

/**
 * Upload rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    message: 'Upload limit exceeded, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:upload:'
    })
  })
});

/**
 * Mint rate limiter
 */
export const mintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 mints per hour
  message: {
    success: false,
    message: 'Minting limit exceeded, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:mint:'
    })
  })
});

/**
 * Search rate limiter
 */
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    success: false,
    message: 'Search limit exceeded, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient && {
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:search:'
    })
  })
});

export default apiLimiter;