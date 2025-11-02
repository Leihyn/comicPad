import express from 'express';
import { param, body } from 'express-validator';
import {
  getUserById,
  updateUserProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFavorites,
  addFavorite,
  removeFavorite,
  getActivity,
  updateSettings
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { uploadProfileImages } from '../middleware/upload.js';
import { User } from '../models/index.js';

const router = express.Router();

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('followers', 'username profile.displayName profile.avatar')
      .populate('following', 'username profile.displayName profile.avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid user ID')],
  validate,
  getUserById
);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  protect,
  uploadProfileImages,
  updateUserProfile
);

/**
 * @route   POST /api/v1/users/:id/follow
 * @desc    Follow user
 * @access  Private
 */
router.post(
  '/:id/follow',
  protect,
  [param('id').isMongoId().withMessage('Invalid user ID')],
  validate,
  followUser
);

/**
 * @route   DELETE /api/v1/users/:id/follow
 * @desc    Unfollow user
 * @access  Private
 */
router.delete(
  '/:id/follow',
  protect,
  [param('id').isMongoId().withMessage('Invalid user ID')],
  validate,
  unfollowUser
);

/**
 * @route   GET /api/v1/users/:id/followers
 * @desc    Get user's followers
 * @access  Public
 */
router.get('/:id/followers', getFollowers);

/**
 * @route   GET /api/v1/users/:id/following
 * @desc    Get user's following
 * @access  Public
 */
router.get('/:id/following', getFollowing);

/**
 * @route   GET /api/v1/users/:id/favorites
 * @desc    Get user's favorite comics
 * @access  Public
 */
router.get('/:id/favorites', getFavorites);

/**
 * @route   POST /api/v1/users/favorites/:comicId
 * @desc    Add comic to favorites
 * @access  Private
 */
router.post(
  '/favorites/:comicId',
  protect,
  [param('comicId').isMongoId().withMessage('Invalid comic ID')],
  validate,
  addFavorite
);

/**
 * @route   DELETE /api/v1/users/favorites/:comicId
 * @desc    Remove comic from favorites
 * @access  Private
 */
router.delete(
  '/favorites/:comicId',
  protect,
  [param('comicId').isMongoId().withMessage('Invalid comic ID')],
  validate,
  removeFavorite
);

/**
 * @route   GET /api/v1/users/:id/activity
 * @desc    Get user's activity feed
 * @access  Public
 */
router.get('/:id/activity', getActivity);

/**
 * @route   PUT /api/v1/users/settings
 * @desc    Update user settings
 * @access  Private
 */
router.put('/settings', protect, updateSettings);

export default router;