import express from 'express';
import { Comic, Collection, User, Transaction, Listing } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getMarketplaceStats, getPlatformStats } from '../controllers/statsController.js';

const router = express.Router();

// Get marketplace statistics
router.get('/marketplace', getMarketplaceStats);

// Get platform statistics
router.get('/platform', asyncHandler(async (req, res) => {
  const totalComics = await Comic.countDocuments({ status: 'published' });
  const totalCreators = await User.countDocuments({ isCreator: true });
  const totalCollectors = await User.countDocuments();
  
  const volumeData = await Transaction.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, totalVolume: { $sum: '$price' } } }
  ]);

  const totalVolume = volumeData.length > 0 ? volumeData[0].totalVolume : 0;

  // Get 24h stats
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const volume24h = await Transaction.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: yesterday }
      }
    },
    {
      $group: {
        _id: null,
        volume: { $sum: '$price' },
        sales: { $sum: 1 }
      }
    }
  ]);

  const dailyStats = volume24h.length > 0 ? volume24h[0] : { volume: 0, sales: 0 };

  res.json({
    success: true,
    data: {
      totalComics,
      totalCreators,
      totalCollectors,
      totalVolume,
      volume24h: dailyStats.volume,
      sales24h: dailyStats.sales
    }
  });
}));

// Get trending comics
router.get('/trending', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const trending = await Comic.find({ status: 'published' })
    .sort({ 'stats.views': -1, 'stats.sales': -1 })
    .limit(parseInt(limit))
    .populate('creator', 'username profile');

  res.json({
    success: true,
    data: trending
  });
}));

export default router;