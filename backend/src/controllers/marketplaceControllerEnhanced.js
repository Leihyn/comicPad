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
  getMarketplaceStats
};

