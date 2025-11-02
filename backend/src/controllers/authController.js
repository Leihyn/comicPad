// backend/src/controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';

console.log('User model methods:', User.schema.methods);
console.log('Has comparePassword in schema:', 'comparePassword' in User.schema.methods);

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ $or: [{ email }, { username }] });

  if (userExists) {
    return res.status(400).json({
      success: false,
      message: userExists.email === email ? 'Email already registered' : 'Username already taken'
    });
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password
  });

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  logger.info(`New user registered: ${user.username} (${user._id})`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isCreator: user.isCreator
      },
      token,
      refreshToken
    }
  });
});

/**
 * @desc    Login with wallet (auto-register if needed)
 * @route   POST /api/v1/auth/wallet-login
 * @access  Public
 */
export const walletLogin = asyncHandler(async (req, res) => {
  const { accountId } = req.body;

  if (!accountId) {
    return res.status(400).json({
      success: false,
      message: 'Account ID is required'
    });
  }

  // Find or create user with this wallet
  let user = await User.findOne({ 'hederaAccount.accountId': accountId });

  if (!user) {
    // Auto-create user with wallet
    const username = `user_${accountId.replace(/\./g, '_')}`;
    user = await User.create({
      username,
      email: `${accountId.replace(/\./g, '_')}@wallet.local`, // Dummy email
      password: Math.random().toString(36).slice(-16), // Random password
      hederaAccount: {
        accountId,
        isVerified: true,
        connectedAt: new Date()
      },
      isCreator: true // Auto-grant creator status
    });
    logger.info(`New user auto-created via wallet: ${accountId}`);
  }

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.json({
    success: true,
    message: 'Logged in successfully',
    data: {
      user: {
        id: user._id,
        username: user.username,
        isCreator: user.isCreator,
        hederaAccount: user.hederaAccount
      },
      token,
      refreshToken
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Debug: Check if comparePassword exists
  console.log('User object type:', user.constructor.name);
  console.log('Has comparePassword method:', typeof user.comparePassword);
  
  // Check if method exists
  if (typeof user.comparePassword !== 'function') {
    logger.error('comparePassword method not found on user model');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error - please contact support'
    });
  }

  // Compare password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  logger.info(`User logged in: ${user.username} (${user._id})`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isCreator: user.isCreator,
        profile: user.profile,
        wallet: user.wallet
      },
      token,
      refreshToken
    }
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('followers', 'username profile.displayName profile.avatar')
    .populate('following', 'username profile.displayName profile.avatar');

  res.json({
    success: true,
    data: { user }
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/auth/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const allowedUpdates = ['username', 'email', 'profile'];
  const updates = {};

  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Check if username/email already taken
  if (updates.username || updates.email) {
    const existing = await User.findOne({
      _id: { $ne: userId },
      $or: [
        { username: updates.username },
        { email: updates.email }
      ]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.username === updates.username 
          ? 'Username already taken' 
          : 'Email already registered'
      });
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password');

  logger.info(`Profile updated: ${userId}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
});

/**
 * @desc    Connect Hedera wallet
 * @route   POST /api/v1/auth/connect-wallet
 * @access  Private
 */
export const connectWallet = asyncHandler(async (req, res) => {
  const { accountId, publicKey } = req.body;
  const userId = req.user.id;

  // Check if wallet already connected to another user
  const existingWallet = await User.findOne({
    'wallet.accountId': accountId,
    _id: { $ne: userId }
  });

  if (existingWallet) {
    return res.status(400).json({
      success: false,
      message: 'This wallet is already connected to another account'
    });
  }

  // Update user wallet
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'wallet.accountId': accountId,
        'wallet.publicKey': publicKey,
        'wallet.connected': true,
        'wallet.connectedAt': Date.now()
      }
    },
    { new: true }
  ).select('-password');

  logger.info(`Wallet connected: ${accountId} to user ${userId}`);

  res.json({
    success: true,
    message: 'Wallet connected successfully',
    data: { user }
  });
});

/**
 * @desc    Disconnect Hedera wallet
 * @route   POST /api/v1/auth/disconnect-wallet
 * @access  Private
 */
export const disconnectWallet = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'wallet.connected': false,
        'wallet.accountId': null,
        'wallet.publicKey': null
      }
    },
    { new: true }
  ).select('-password');

  logger.info(`Wallet disconnected: user ${userId}`);

  res.json({
    success: true,
    message: 'Wallet disconnected successfully',
    data: { user }
  });
});

/**
 * @desc    Request creator status
 * @route   POST /api/v1/auth/request-creator
 * @access  Private
 */
export const requestCreatorStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { bio } = req.body;

  const user = await User.findById(userId);

  if (user.isCreator) {
    return res.status(400).json({
      success: false,
      message: 'You are already a creator'
    });
  }

  if (!user.wallet.connected) {
    return res.status(400).json({
      success: false,
      message: 'Please connect your Hedera wallet first'
    });
  }

  // Auto-approve for now
  user.isCreator = true;
  user.role = 'creator';
  if (bio) {
    user.profile.bio = bio;
  }
  await user.save();

  logger.info(`Creator status granted: ${userId}`);

  res.json({
    success: true,
    message: 'Creator status granted successfully',
    data: { user }
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId).select('+password');

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  logger.info(`Password changed: ${userId}`);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token required'
    });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  logger.info(`User logged out: ${req.user.id}`);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default {
  register,
  login,
  getProfile,
  updateProfile,
  connectWallet,
  disconnectWallet,
  requestCreatorStatus,
  changePassword,
  refreshToken,
  logout
};