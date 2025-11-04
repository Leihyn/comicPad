import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  walletLogin,
  getProfile,
  updateProfile,
  connectWallet,
  disconnectWallet,
  requestCreatorStatus,
  changePassword,
  refreshToken,
  logout
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores and hyphens'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  validate,
  register
);

/**
 * @route   POST /api/v1/auth/wallet-login
 * @desc    Login with wallet (auto-register)
 * @access  Public
 */
router.post(
  '/wallet-login',
  [
    body('accountId')
      .notEmpty()
      .withMessage('Account ID is required')
      .matches(/^0\.0\.\d+$/)
      .withMessage('Invalid Hedera account ID format')
  ],
  validate,
  walletLogin
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validate,
  login
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', protect, getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', protect, updateProfile);

/**
 * @route   POST /api/v1/auth/connect-wallet
 * @desc    Connect Hedera wallet
 * @access  Private
 */
router.post(
  '/connect-wallet',
  protect,
  [
    body('accountId')
      .notEmpty()
      .withMessage('Account ID is required')
      .matches(/^0\.0\.\d+$/)
      .withMessage('Invalid Hedera account ID format'),
    body('publicKey')
      .optional()
  ],
  validate,
  connectWallet
);

/**
 * @route   POST /api/v1/auth/disconnect-wallet
 * @desc    Disconnect Hedera wallet
 * @access  Private
 */
router.post('/disconnect-wallet', protect, disconnectWallet);

/**
 * @route   POST /api/v1/auth/request-creator
 * @desc    Request creator status
 * @access  Private
 */
router.post(
  '/request-creator',
  protect,
  [
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters')
  ],
  validate,
  requestCreatorStatus
);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  validate,
  changePassword
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh-token',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ],
  validate,
  refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', protect, logout);

export default router;