import { User, Comic, Transaction } from '../models/index.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import ipfsService from '../services/ipfsService.js';
import fs from 'fs';

/**
 * @desc    Get user by ID
 * @route   GET /api/v1/users/:id
 * @access  Public
 */
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id)
    .select('-password')
    .populate('followers', 'username profile.displayName profile.avatar')
    .populate('following', 'username profile.displayName profile.avatar');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get user's stats
  let stats = {
    comics: 0,
    collections: 0,
    totalSales: 0,
    totalVolume: 0
  };

  if (user.isCreator) {
    const Comic = (await import('../models/index.js')).Comic;
    const Collection = (await import('../models/index.js')).Collection;
    
    stats.comics = await Comic.countDocuments({ creator: id, status: 'published' });
    stats.collections = await Collection.countDocuments({ creator: id });
    
    // Get sales stats
    const transactions = await Transaction.aggregate([
      { $match: { 'from.user': user._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalVolume: { $sum: '$price' }
        }
      }
    ]);
    
    if (transactions.length > 0) {
      stats.totalSales = transactions[0].totalSales;
      stats.totalVolume = transactions[0].totalVolume;
    }
  }

  res.json({
    success: true,
    data: {
      user,
      stats
    }
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/users/profile
 * @access  Private
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const allowedUpdates = {
    'profile.displayName': req.body.displayName,
    'profile.bio': req.body.bio,
    'profile.location': req.body.location,
    'profile.website': req.body.website,
    'profile.social.twitter': req.body.twitter,
    'profile.social.discord': req.body.discord,
    'profile.social.instagram': req.body.instagram
  };

  const updates = {};
  Object.keys(allowedUpdates).forEach(key => {
    if (allowedUpdates[key] !== undefined) {
      updates[key] = allowedUpdates[key];
    }
  });

  // Handle avatar upload
  if (req.files?.avatar) {
    const upload = await ipfsService.uploadFile(req.files.avatar[0].path, {
      metadata: { type: 'avatar', userId }
    });
    updates['profile.avatar'] = upload.url;
    fs.unlinkSync(req.files.avatar[0].path);
  }

  // Handle cover image upload
  if (req.files?.coverImage) {
    const upload = await ipfsService.uploadFile(req.files.coverImage[0].path, {
      metadata: { type: 'cover', userId }
    });
    updates['profile.coverImage'] = upload.url;
    fs.unlinkSync(req.files.coverImage[0].path);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password');

  logger.info(`User profile updated: ${userId}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
});

/**
 * @desc    Follow user
 * @route   POST /api/v1/users/:id/follow
 * @access  Private
 */
export const followUser = asyncHandler(async (req, res) => {
  const { id: targetUserId } = req.params;
  const currentUserId = req.user.id;

  if (targetUserId === currentUserId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot follow yourself'
    });
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const currentUser = await User.findById(currentUserId);

  // Check if already following
  if (currentUser.following.includes(targetUserId)) {
    return res.status(400).json({
      success: false,
      message: 'Already following this user'
    });
  }

  // Add to following/followers
  currentUser.following.push(targetUserId);
  targetUser.followers.push(currentUserId);

  await currentUser.save();
  await targetUser.save();

  logger.info(`User ${currentUserId} followed ${targetUserId}`);

  res.json({
    success: true,
    message: 'User followed successfully',
    data: {
      following: currentUser.following.length,
      followers: targetUser.followers.length
    }
  });
});

/**
 * @desc    Unfollow user
 * @route   DELETE /api/v1/users/:id/follow
 * @access  Private
 */
export const unfollowUser = asyncHandler(async (req, res) => {
  const { id: targetUserId } = req.params;
  const currentUserId = req.user.id;

  const currentUser = await User.findById(currentUserId);
  const targetUser = await User.findById(targetUserId);

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Remove from following/followers
  currentUser.following = currentUser.following.filter(
    id => id.toString() !== targetUserId
  );
  targetUser.followers = targetUser.followers.filter(
    id => id.toString() !== currentUserId
  );

  await currentUser.save();
  await targetUser.save();

  logger.info(`User ${currentUserId} unfollowed ${targetUserId}`);

  res.json({
    success: true,
    message: 'User unfollowed successfully'
  });
});

/**
 * @desc    Get user's followers
 * @route   GET /api/v1/users/:id/followers
 * @access  Public
 */
export const getFollowers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const user = await User.findById(id)
    .populate({
      path: 'followers',
      select: 'username profile.displayName profile.avatar',
      options: {
        limit: limit * 1,
        skip: (page - 1) * limit
      }
    });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: {
      followers: user.followers,
      total: user.followers.length
    }
  });
});

/**
 * @desc    Get user's following
 * @route   GET /api/v1/users/:id/following
 * @access  Public
 */
export const getFollowing = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const user = await User.findById(id)
    .populate({
      path: 'following',
      select: 'username profile.displayName profile.avatar',
      options: {
        limit: limit * 1,
        skip: (page - 1) * limit
      }
    });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: {
      following: user.following,
      total: user.following.length
    }
  });
});

/**
 * @desc    Get user's favorites
 * @route   GET /api/v1/users/:id/favorites
 * @access  Public
 */
export const getFavorites = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const user = await User.findById(id)
    .populate({
      path: 'favorites',
      populate: [
        { path: 'creator', select: 'username profile' },
        { path: 'collection', select: 'name symbol' }
      ],
      options: {
        limit: limit * 1,
        skip: (page - 1) * limit
      }
    });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: {
      favorites: user.favorites,
      total: user.favorites.length
    }
  });
});

/**
 * @desc    Add comic to favorites
 * @route   POST /api/v1/users/favorites/:comicId
 * @access  Private
 */
export const addFavorite = asyncHandler(async (req, res) => {
  const { comicId } = req.params;
  const userId = req.user.id;

  const comic = await Comic.findById(comicId);
  if (!comic) {
    return res.status(404).json({
      success: false,
      message: 'Comic not found'
    });
  }

  const user = await User.findById(userId);

  if (user.favorites.includes(comicId)) {
    return res.status(400).json({
      success: false,
      message: 'Comic already in favorites'
    });
  }

  user.favorites.push(comicId);
  await user.save();

  // Update comic stats
  comic.stats.favorites += 1;
  await comic.save();

  logger.info(`User ${userId} added comic ${comicId} to favorites`);

  res.json({
    success: true,
    message: 'Added to favorites'
  });
});

/**
 * @desc    Remove comic from favorites
 * @route   DELETE /api/v1/users/favorites/:comicId
 * @access  Private
 */
export const removeFavorite = asyncHandler(async (req, res) => {
  const { comicId } = req.params;
  const userId = req.user.id;

  const user = await User.findById(userId);
  const comic = await Comic.findById(comicId);

  user.favorites = user.favorites.filter(id => id.toString() !== comicId);
  await user.save();

  if (comic) {
    comic.stats.favorites = Math.max(0, comic.stats.favorites - 1);
    await comic.save();
  }

  logger.info(`User ${userId} removed comic ${comicId} from favorites`);

  res.json({
    success: true,
    message: 'Removed from favorites'
  });
});

/**
 * @desc    Get user's activity feed
 * @route   GET /api/v1/users/:id/activity
 * @access  Public
 */
export const getActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const activities = await Transaction.find({
    $or: [
      { 'from.user': id },
      { 'to.user': id }
    ]
  })
    .populate('comic', 'title content.coverImage')
    .populate('from.user', 'username profile.displayName profile.avatar')
    .populate('to.user', 'username profile.displayName profile.avatar')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Transaction.countDocuments({
    $or: [
      { 'from.user': id },
      { 'to.user': id }
    ]
  });

  res.json({
    success: true,
    data: {
      activities,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    }
  });
});

/**
 * @desc    Update user settings
 * @route   PUT /api/v1/users/settings
 * @access  Private
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { settings } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { settings } },
    { new: true, runValidators: true }
  ).select('-password');

  logger.info(`User settings updated: ${userId}`);

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: { settings: user.settings }
  });
});

export default {
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
};