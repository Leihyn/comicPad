import { asyncHandler } from '../middleware/errorHandler.js';
import { Comic, Listing } from '../models/index.js';

/**
 * @desc    Get marketplace statistics
 * @route   GET /api/v1/stats/marketplace
 * @access  Public
 */
export const getMarketplaceStats = asyncHandler(async (req, res) => {
  // Get active auctions count
  const activeAuctions = await Listing.countDocuments({
    status: 'active',
    listingType: 'auction'
  });

  // Get all active listings to calculate volume and floor price
  const activeListings = await Listing.find({
    status: 'active'
  }).select('price listingType');

  // Calculate total volume (sum of all listing prices)
  const totalVolume = activeListings.reduce((sum, listing) => {
    return sum + (parseFloat(listing.price) || 0);
  }, 0);

  // Calculate floor price (lowest price among active listings)
  const prices = activeListings
    .map(l => parseFloat(l.price))
    .filter(p => p > 0);

  const floorPrice = prices.length > 0 ? Math.min(...prices) : 0;

  // Total active listings
  const totalListings = activeListings.length;

  res.json({
    success: true,
    data: {
      activeAuctions,
      totalVolume: parseFloat(totalVolume.toFixed(2)),
      floorPrice: parseFloat(floorPrice.toFixed(2)),
      totalListings
    }
  });
});

/**
 * @desc    Get platform statistics
 * @route   GET /api/v1/stats/platform
 * @access  Public
 */
export const getPlatformStats = asyncHandler(async (req, res) => {
  const totalComics = await Comic.countDocuments({ status: { $ne: 'draft' } });
  const totalPublished = await Comic.countDocuments({ status: 'published' });
  const totalVolume = 0; // TODO: Calculate from transactions
  const totalCreators = await Comic.distinct('creator').length;

  res.json({
    success: true,
    data: {
      totalComics,
      totalPublished,
      totalVolume,
      totalCreators,
      totalCollectors: 0 // TODO: Count unique NFT owners
    }
  });
});

export default {
  getMarketplaceStats,
  getPlatformStats
};
