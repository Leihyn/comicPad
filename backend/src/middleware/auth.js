import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Protect routes - require authentication
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database (token payload has 'id', not 'userId')
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      next();
    } catch (err) {
      logger.error('Token verification error:', err);
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Authorize specific roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

/**
 * Check if user is creator
 */
export const requireCreator = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!req.user.isCreator) {
      return res.status(403).json({
        success: false,
        message: 'You must be a creator to access this route'
      });
    }

    next();
  } catch (error) {
    logger.error('Creator check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

/**
 * Check Hedera wallet connection
 */
export const requireWallet = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!req.user.wallet || !req.user.wallet.accountId) {
      return res.status(403).json({
        success: false,
        message: 'Please connect your Hedera wallet first'
      });
    }

    next();
  } catch (error) {
    logger.error('Wallet check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Wallet verification error'
    });
  }
};

/**
 * Optional auth - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
      } catch (err) {
        // Token invalid but continue without user
        req.user = null;
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth error:', error);
    next();
  }
};

export default {
  protect,
  authorize,
  requireCreator,
  requireWallet,
  optionalAuth
};