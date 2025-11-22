// backend/src/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

// Load environment variables FIRST
dotenv.config();

// Force Google DNS to bypass Windows DNS issues
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);
console.log('✅ Forced DNS to Google DNS:', dns.getServers().slice(0, 2).join(', '));

// ADD THESE DEBUG LINES:
console.log('🔍 Environment Variables Check:');
console.log('PINATA_JWT exists:', !!process.env.PINATA_JWT);
console.log('PINATA_JWT preview:', process.env.PINATA_JWT?.substring(0, 50) + '...');
console.log('HEDERA_OPERATOR_ID:', process.env.HEDERA_OPERATOR_ID);
console.log('HEDERA_OPERATOR_KEY exists:', !!process.env.HEDERA_OPERATOR_KEY);
console.log('HEDERA_OPERATOR_KEY preview:', process.env.HEDERA_OPERATOR_KEY?.substring(0, 30) + '...');
console.log('---\n');


import { connectDB } from './config/databaseDemo.js'; // Use in-memory database for demo
import { connectRedis } from './config/redis.js';
import logger from './utils/logger.js';
import errorHandler, { notFound } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Load environment variables
//dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Connect to Redis (optional)
if (process.env.REDIS_URL) {
  connectRedis().catch(err => {
    logger.warn('Redis connection failed, continuing without cache:', err.message);
  });
}

// Trust proxy (if behind reverse proxy like nginx)
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet()); // Set security headers
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://localhost:5179',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(mongoSanitize()); // Prevent MongoDB injection
app.use(hpp()); // Prevent HTTP parameter pollution

// Body Parser Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression Middleware
app.use(compression());

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Rate Limiting
app.use('/api/', apiLimiter);

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import readerRoutes from './routes/readerRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import statsRoutes from './routes/statsRoutes.js';

// Enhanced Routes (New Comic Pad Functionality)
import comicRoutesEnhanced from './routes/comicRoutesEnhanced.js';
import marketplaceRoutesEnhanced from './routes/marketplaceRoutesEnhanced.js';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/comics', comicRoutesEnhanced); // Enhanced comic routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/marketplace', marketplaceRoutesEnhanced); // Enhanced marketplace routes
app.use('/api/v1/reader', readerRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/stats', statsRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Comic Pad API',
    version: '1.0.0',
    docs: '/api-docs'
  });
});

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

export default app;


