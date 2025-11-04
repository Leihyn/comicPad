// backend/src/controllers/marketplaceControllerEnhanced.js
import marketplaceService from '../services/marketplaceServiceEnhanced.js';
import { Listing } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Enhanced Marketplace Controller
 * Handles listings, auctions, and sales
 */

/**
 * Create fixed-price listing
 * POST /api/marketplace/listings
 */
export const createListing = async (req, res) => {
  try {
    const {
      tokenId,
      serialNumber,
      episodeId,
      price,
      currency,
      expiresIn
    } = req.body;

    const userId = req.user.id;
    const accountId = req.user.wallet?.accountId || req.user.hederaAccount?.accountId;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Hedera wallet not connected'
      });
    }

    const listing = await marketplaceService.createListing({
      userId,
      accountId,
      tokenId,
      serialNumber,
      episodeId,
      price,
      currency,
      expiresIn
    });

    res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: listing
    });
  } catch (error) {
    logger.error('Error in createListing controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create auction listing
 * POST /api/marketplace/auctions
 */
export const createAuction = async (req, res) => {
  try {
    const {
      tokenId,
      serialNumber,
      episodeId,
      startingPrice,
      reservePrice,
      minimumBidIncrement,
      durationHours
    } = req.body;

    const userId = req.user.id;
    const accountId = req.user.wallet?.accountId || req.user.hederaAccount?.accountId;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Hedera wallet not connected'
      });
    }

    const auction = await marketplaceService.createAuction({
      userId,
      accountId,
      tokenId,
      serialNumber,
      episodeId,
      startingPrice,
      reservePrice,
      minimumBidIncrement,
      durationHours
    });

    res.status(201).json({
      success: true,
      message: 'Auction created successfully',
      data: auction
    });
  } catch (error) {
    logger.error('Error in createAuction controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Place bid on auction
 * POST /api/marketplace/auctions/:listingId/bid
 */
export const placeBid = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { amount, transactionId } = req.body;

    const userId = req.user.id;
    const accountId = req.user.wallet?.accountId || req.user.hederaAccount?.accountId;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Hedera wallet not connected'
      });
    }

    const listing = await marketplaceService.placeBid({
      listingId,
      userId,
      accountId,
      amount,
      transactionId
    });

    res.json({
      success: true,
      message: 'Bid placed successfully',
      data: listing
    });
  } catch (error) {
    logger.error('Error in placeBid controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Buy NFT (fixed-price)
 * POST /api/marketplace/listings/:listingId/buy
 */
export const buyNFT = async (req, res) => {
  try {
    const { listingId } = req.params;

    const buyerId = req.user.id;
    const walletAccountId = req.user.wallet?.accountId;
    const hederaAccountId = req.user.hederaAccount?.accountId;
    const buyerAccountId = walletAccountId || hederaAccountId;

    logger.info('Buy NFT request:', {
      listingId,
      buyerId,
      walletAccountId,
      hederaAccountId,
      buyerAccountId,
      userWallet: req.user.wallet,
      userHederaAccount: req.user.hederaAccount
    });

    if (!buyerAccountId) {
      logger.error('No buyer account ID found:', {
        wallet: req.user.wallet,
        hederaAccount: req.user.hederaAccount,
        user: req.user
      });
      return res.status(400).json({
        success: false,
        message: 'Hedera wallet not connected'
      });
    }

    const result = await marketplaceService.buyNFT({
      listingId,
      buyerId,
      buyerAccountId
    });

    res.json({
      success: true,
      message: 'NFT purchased successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in buyNFT controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Complete auction
 * POST /api/marketplace/auctions/:listingId/complete
 */
export const completeAuction = async (req, res) => {
  try {
    const { listingId } = req.params;

    const result = await marketplaceService.completeAuction(listingId);

    res.json({
      success: true,
      message: result.status === 'sold' ? 'Auction completed' : 'Auction ended',
      data: result
    });
  } catch (error) {
    logger.error('Error in completeAuction controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Cancel listing
 * DELETE /api/marketplace/listings/:listingId
 */
export const cancelListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = req.user.id;

    const listing = await marketplaceService.cancelListing(listingId, userId);

    res.json({
      success: true,
      message: 'Listing cancelled successfully',
      data: listing
    });
  } catch (error) {
    logger.error('Error in cancelListing controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all active listings
 * GET /api/marketplace/listings
 */
export const getListings = async (req, res) => {
  try {
    const {
      listingType,
      comicId,
      episodeId,
      minPrice,
      maxPrice,
      limit = 20,
      skip = 0
    } = req.query;

    const listings = await marketplaceService.getActiveListings({
      listingType,
      comicId,
      episodeId,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    res.json({
      success: true,
      data: listings
    });
  } catch (error) {
    logger.error('Error in getListings controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get listing by ID
 * GET /api/marketplace/listings/:listingId
 */
export const getListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await Listing.findById(listingId)
      .populate('episode', 'title description content.coverImage')
      .populate('comic', 'title')
      .populate('seller', 'username profile.displayName')
      .populate('buyer', 'username profile.displayName');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Increment views
    await listing.incrementViews();

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    logger.error('Error in getListing controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user's listings
 * GET /api/marketplace/users/me/listings
 */
export const getMyListings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const query = { seller: userId };
    if (status) query.status = status;

    const listings = await Listing.find(query)
      .populate('episode', 'title content.coverImage')
      .populate('comic', 'title')
      .sort('-listedAt');

    res.json({
      success: true,
      data: listings
    });
  } catch (error) {
    logger.error('Error in getMyListings controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get marketplace stats
 * GET /api/marketplace/stats
 */
export const getMarketplaceStats = async (req, res) => {
  try {
    const stats = await marketplaceService.getMarketplaceStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error in getMarketplaceStats controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get Marketplace Transaction History
 * GET /api/marketplace/history
 */
export const getMarketplaceHistory = async (req, res) => {
  try {
    const { MarketplaceTransaction } = await import('../models/index.js');
    const {
      type,
      status,
      limit = 50,
      skip = 0,
      includeOld = 'true'
    } = req.query;

    const userId = req.user.id;

    // Get new logged transactions
    const history = await MarketplaceTransaction.getUserHistory(userId, {
      type,
      status,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    const total = await MarketplaceTransaction.countDocuments({
      $or: [
        { 'buyer.userId': userId },
        { 'seller.userId': userId }
      ],
      ...(type && { type }),
      ...(status && { status })
    });

    // If includeOld is true and filters allow it, fetch from old Listing model
    let oldListings = [];
    if (includeOld === 'true' &&
        status !== 'failed' &&
        status !== 'pending' &&
        history.length < parseInt(limit)) {
      const { Listing } = await import('../models/index.js');

      // Find sold listings that aren't already in MarketplaceTransaction
      const transactionListingIds = history.map(tx => tx.listingId?.toString()).filter(Boolean);

      const listingQuery = {
        status: 'sold',
        _id: { $nin: transactionListingIds },
        $or: [
          { buyer: userId },
          { seller: userId }
        ]
      };

      // Apply type filter for old listings
      if (type && type !== 'all') {
        if (type === 'purchase') {
          listingQuery.listingType = 'fixed-price';
        } else if (type === 'auction_complete') {
          listingQuery.listingType = 'auction';
        } else if (type === 'listing') {
          // Don't include old listings when filtering by 'listing' type
          // since old data only has completed sales
        }
      }

      // Only fetch if type filter allows it
      if (type !== 'listing') {
        oldListings = await Listing.find(listingQuery)
          .populate('episode')
          .populate('comic')
          .sort({ soldAt: -1, updatedAt: -1 })
          .limit(parseInt(limit) - history.length);

        logger.info(`Found ${oldListings.length} old listings to include`);
      }
    }

    // Convert old listings to transaction format
    const oldTransactions = oldListings.map(listing => ({
      _id: listing._id,
      type: listing.listingType === 'auction' ? 'auction_complete' : 'purchase',
      status: 'completed',
      buyer: {
        userId: listing.buyer,
        accountId: listing.buyerAccountId
      },
      seller: {
        userId: listing.seller,
        accountId: listing.sellerAccountId
      },
      nft: {
        tokenId: listing.tokenId,
        serialNumber: listing.serialNumber,
        comicId: listing.comic,
        episodeId: listing.episode
      },
      listingId: listing._id,
      price: {
        amount: listing.price?.amount || 0,
        currency: listing.price?.currency || 'HBAR'
      },
      fees: {
        platformFee: (listing.price?.amount || 0) * 0.025,
        royaltyFee: (listing.price?.amount || 0) * ((listing.comic?.royaltyPercentage || 0) / 100),
        totalFees: (listing.price?.amount || 0) * (0.025 + ((listing.comic?.royaltyPercentage || 0) / 100))
      },
      hederaTransaction: {
        transactionId: listing.transactionId || 'unknown',
        explorerUrl: listing.explorerUrl
      },
      initiatedAt: listing.createdAt,
      completedAt: listing.soldAt || listing.updatedAt,
      isLegacy: true // Flag to indicate this is from old data
    }));

    // Combine and sort by date
    const allTransactions = [...history, ...oldTransactions].sort((a, b) => {
      const dateA = a.completedAt || a.initiatedAt;
      const dateB = b.completedAt || b.initiatedAt;
      return new Date(dateB) - new Date(dateA);
    });

    // Apply frontend-side limit to combined results
    const limitedTransactions = allTransactions.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        transactions: limitedTransactions,
        pagination: {
          total: total + oldListings.length,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: (total + oldListings.length) > parseInt(skip) + parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching marketplace history:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get Transaction by ID
 * GET /api/marketplace/history/:transactionId
 */
export const getTransaction = async (req, res) => {
  try {
    const { MarketplaceTransaction } = await import('../models/index.js');
    const { transactionId } = req.params;

    const transaction = await MarketplaceTransaction.findById(transactionId)
      .populate('buyer.userId', 'username email')
      .populate('seller.userId', 'username email')
      .populate('nft.comicId', 'title coverImage')
      .populate('nft.episodeId', 'episodeNumber title')
      .populate('listingId');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if user is involved in this transaction
    const userId = req.user.id;
    const isInvolved =
      transaction.buyer?.userId?._id?.toString() === userId ||
      transaction.seller?.userId?._id?.toString() === userId;

    if (!isInvolved) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this transaction'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get Marketplace Transaction Statistics
 * GET /api/marketplace/stats/transactions
 */
export const getTransactionStats = async (req, res) => {
  try {
    const { MarketplaceTransaction } = await import('../models/index.js');
    const { timeRange = 30 } = req.query;

    const stats = await MarketplaceTransaction.getMarketplaceStats(parseInt(timeRange));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  createListing,
  createAuction,
  placeBid,
  buyNFT,
  completeAuction,
  cancelListing,
  getListings,
  getListing,
  getMyListings,
  getMarketplaceStats,
  getMarketplaceHistory,
  getTransaction,
  getTransactionStats
};

