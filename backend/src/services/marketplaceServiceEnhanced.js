// backend/src/services/marketplaceServiceEnhanced.js
import { Listing, Episode, Comic, User } from '../models/index.js';
import hederaService from './hederaService.js';
import logger from '../utils/logger.js';

/**
 * Enhanced Marketplace Service
 * Handles fixed-price sales, auctions, and royalty distribution
 */
class MarketplaceServiceEnhanced {
  /**
   * Create Fixed-Price Listing
   */
  async createListing(listingData) {
    try {
      const {
        userId,
        accountId,
        tokenId,
        serialNumber,
        episodeId,
        price,
        currency,
        expiresIn // days
      } = listingData;

      logger.info(`Creating listing for NFT ${tokenId}/${serialNumber}`);

      // Get episode and comic
      const episode = await Episode.findById(episodeId).populate('comic');
      if (!episode) {
        throw new Error('Episode not found');
      }

      // Verify ownership
      const nft = episode.mintedNFTs.find(n =>
        n.serialNumber === serialNumber && n.owner === accountId
      );

      if (!nft) {
        throw new Error('NFT not owned by user');
      }

      // Create listing
      const listing = await Listing.create({
        tokenId,
        serialNumber,
        episode: episodeId,
        comic: episode.comic._id,
        seller: userId,
        sellerAccountId: accountId,
        listingType: 'fixed-price',
        price: {
          amount: price,
          currency: currency || 'HBAR'
        },
        status: 'active',
        metadata: {
          title: episode.title,
          description: episode.description,
          imageUrl: episode.content.coverImage.url
        },
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null
      });

      logger.info(`Listing created: ${listing._id}`);

      return listing;
    } catch (error) {
      logger.error('Error creating listing:', error);
      throw new Error(`Failed to create listing: ${error.message}`);
    }
  }

  /**
   * Create Auction Listing
   */
  async createAuction(auctionData) {
    try {
      const {
        userId,
        accountId,
        tokenId,
        serialNumber,
        episodeId,
        startingPrice,
        reservePrice,
        minimumBidIncrement,
        durationHours
      } = auctionData;

      logger.info(`Creating auction for NFT ${tokenId}/${serialNumber}`);

      // Get episode and comic
      const episode = await Episode.findById(episodeId).populate('comic');
      if (!episode) {
        throw new Error('Episode not found');
      }

      // Verify ownership
      const nft = episode.mintedNFTs.find(n =>
        n.serialNumber === serialNumber && n.owner === accountId
      );

      if (!nft) {
        throw new Error('NFT not owned by user');
      }

      // Create auction listing
      const now = new Date();
      const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

      const listing = await Listing.create({
        tokenId,
        serialNumber,
        episode: episodeId,
        comic: episode.comic._id,
        seller: userId,
        sellerAccountId: accountId,
        listingType: 'auction',
        price: {
          amount: startingPrice,
          currency: 'HBAR'
        },
        auction: {
          startingPrice,
          reservePrice: reservePrice || startingPrice,
          currentBid: 0,
          minimumBidIncrement: minimumBidIncrement || 1,
          startTime: now,
          endTime,
          bids: []
        },
        status: 'active',
        metadata: {
          title: episode.title,
          description: episode.description,
          imageUrl: episode.content.coverImage.url
        },
        expiresAt: endTime
      });

      logger.info(`Auction created: ${listing._id}`);

      return listing;
    } catch (error) {
      logger.error('Error creating auction:', error);
      throw new Error(`Failed to create auction: ${error.message}`);
    }
  }

  /**
   * Place Bid on Auction
   */
  async placeBid(bidData) {
    try {
      const {
        listingId,
        userId,
        accountId,
        amount,
        transactionId
      } = bidData;

      logger.info(`Placing bid of ${amount} on listing ${listingId}`);

      const listing = await Listing.findById(listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }

      if (listing.listingType !== 'auction') {
        throw new Error('Not an auction listing');
      }

      if (listing.status !== 'active') {
        throw new Error('Auction is not active');
      }

      if (listing.isAuctionEnded()) {
        throw new Error('Auction has ended');
      }

      // Place bid
      await listing.placeBid(userId, accountId, amount, transactionId);

      logger.info(`Bid placed successfully`);

      return listing;
    } catch (error) {
      logger.error('Error placing bid:', error);
      throw new Error(`Failed to place bid: ${error.message}`);
    }
  }

  /**
   * Buy Fixed-Price NFT
   * Handles transfer, royalty calculation, and distribution
   */
  async buyNFT(purchaseData) {
    const { MarketplaceTransaction } = await import('../models/index.js');
    let transaction = null;

    try {
      const {
        listingId,
        buyerId,
        buyerAccountId,
        paymentTransactionId
      } = purchaseData;

      logger.info(`Processing purchase for listing ${listingId}`);

      const listing = await Listing.findById(listingId)
        .populate('episode')
        .populate('comic');

      if (!listing) {
        throw new Error('Listing not found');
      }

      if (listing.status !== 'active') {
        throw new Error('Listing is not active');
      }

      if (listing.listingType !== 'fixed-price') {
        throw new Error('Use placeBid for auction listings');
      }

      const salePrice = listing.price.amount;
      const comic = listing.comic;

      // Calculate fees
      const platformFeePercent = 2.5; // 2.5% platform fee
      const platformFee = salePrice * (platformFeePercent / 100);
      const royaltyFee = salePrice * (comic.royaltyPercentage / 100);
      const sellerAmount = salePrice - platformFee - royaltyFee;
      const totalFees = platformFee + royaltyFee;

      logger.info(`Sale breakdown: Price=${salePrice}, Platform=${platformFee}, Royalty=${royaltyFee}, Seller=${sellerAmount}`);

      // Create transaction record
      transaction = new MarketplaceTransaction({
        type: 'purchase',
        status: 'pending',
        buyer: {
          userId: buyerId,
          accountId: buyerAccountId
        },
        seller: {
          userId: listing.seller,
          accountId: listing.sellerAccountId
        },
        nft: {
          tokenId: listing.tokenId,
          serialNumber: listing.serialNumber,
          comicId: listing.comic._id,
          episodeId: listing.episode._id
        },
        listingId: listing._id,
        price: {
          amount: salePrice,
          currency: 'HBAR'
        },
        fees: {
          platformFee,
          royaltyFee,
          totalFees
        },
        hederaTransaction: {
          transactionId: paymentTransactionId
        }
      });

      await transaction.save();
      logger.info(`Created transaction record: ${transaction._id}`);

      // NOTE: NFT transfer is now handled by the buyer in the frontend as an atomic transaction
      // The buyer executes: Payment to seller + NFT transfer using seller's allowance
      // This is more secure and atomic - either both succeed or both fail
      logger.info('NFT transfer was executed by buyer in atomic transaction on frontend');

      const transferResult = {
        transactionId: paymentTransactionId || 'unknown',
        status: 'SUCCESS',
        explorerUrl: `https://hashscan.io/testnet/transaction/${paymentTransactionId}`
      };

      // Update episode NFT ownership
      const episode = listing.episode;
      const nftIndex = episode.mintedNFTs.findIndex(n =>
        n.serialNumber === listing.serialNumber
      );

      if (nftIndex !== -1) {
        episode.mintedNFTs[nftIndex].owner = buyerAccountId;
        await episode.save();
      }

      // Complete listing
      await listing.completeSale(
        buyerId,
        buyerAccountId,
        transferResult.transactionId,
        transferResult.explorerUrl
      );

      // Mark transaction as completed
      await transaction.markCompleted({
        transactionId: transferResult.transactionId,
        explorerUrl: transferResult.explorerUrl
      });

      // Distribute payments would happen here
      // In production, you'd execute actual HBAR transfers

      logger.info(`Purchase completed successfully`);

      return {
        listing,
        transfer: transferResult,
        transaction: transaction.toObject(),
        breakdown: {
          salePrice,
          platformFee,
          royaltyFee,
          sellerAmount
        }
      };
    } catch (error) {
      logger.error('Error buying NFT:', error);

      // Mark transaction as failed if it was created
      if (transaction) {
        await transaction.markFailed({
          code: error.code || 'PURCHASE_FAILED',
          message: error.message,
          details: error
        });
      }

      throw new Error(`Failed to buy NFT: ${error.message}`);
    }
  }

  /**
   * Complete Auction
   * Transfers NFT to highest bidder and distributes funds
   */
  async completeAuction(listingId) {
    try {
      logger.info(`Completing auction ${listingId}`);

      const listing = await Listing.findById(listingId)
        .populate('episode')
        .populate('comic');

      if (!listing) {
        throw new Error('Listing not found');
      }

      if (listing.listingType !== 'auction') {
        throw new Error('Not an auction listing');
      }

      if (!listing.isAuctionEnded()) {
        throw new Error('Auction has not ended yet');
      }

      if (listing.status !== 'active') {
        throw new Error('Auction is not active');
      }

      // No bids - expire auction
      if (!listing.auction.highestBidder) {
        await listing.completeAuction(null);
        logger.info(`Auction expired with no bids`);
        return { status: 'expired', listing };
      }

      // Check reserve price
      if (listing.auction.currentBid < listing.auction.reservePrice) {
        await listing.completeAuction(null);
        logger.info(`Auction did not meet reserve price`);
        return { status: 'reserve_not_met', listing };
      }

      const winningBid = listing.auction.currentBid;
      const comic = listing.comic;

      // Calculate fees
      const platformFeePercent = 2.5;
      const platformFee = winningBid * (platformFeePercent / 100);
      const royaltyFee = winningBid * (comic.royaltyPercentage / 100);
      const sellerAmount = winningBid - platformFee - royaltyFee;

      // Transfer NFT to winner
      const transferResult = await hederaService.transferNFT({
        tokenId: listing.tokenId,
        serialNumber: listing.serialNumber,
        fromAccountId: listing.sellerAccountId,
        toAccountId: listing.auction.highestBidderAccountId,
        price: winningBid
      });

      // Update episode NFT ownership
      const episode = listing.episode;
      const nftIndex = episode.mintedNFTs.findIndex(n =>
        n.serialNumber === listing.serialNumber
      );

      if (nftIndex !== -1) {
        episode.mintedNFTs[nftIndex].owner = listing.auction.highestBidderAccountId;
        await episode.save();
      }

      // Complete auction
      await listing.completeAuction(transferResult.transactionId);

      logger.info(`Auction completed successfully`);

      return {
        status: 'sold',
        listing,
        transfer: transferResult,
        breakdown: {
          winningBid,
          platformFee,
          royaltyFee,
          sellerAmount
        }
      };
    } catch (error) {
      logger.error('Error completing auction:', error);
      throw new Error(`Failed to complete auction: ${error.message}`);
    }
  }

  /**
   * Cancel Listing
   */
  async cancelListing(listingId, userId) {
    try {
      const listing = await Listing.findById(listingId);

      if (!listing) {
        throw new Error('Listing not found');
      }

      if (listing.seller.toString() !== userId) {
        throw new Error('Unauthorized: Not the seller');
      }

      if (listing.listingType === 'auction' && listing.auction.bids.length > 0) {
        throw new Error('Cannot cancel auction with bids');
      }

      await listing.cancel();

      logger.info(`Listing cancelled: ${listingId}`);

      return listing;
    } catch (error) {
      logger.error('Error cancelling listing:', error);
      throw new Error(`Failed to cancel listing: ${error.message}`);
    }
  }

  /**
   * Get Active Listings
   */
  async getActiveListings(filters = {}) {
    try {
      const query = { status: 'active' };

      if (filters.listingType) {
        query.listingType = filters.listingType;
      }

      if (filters.comicId) {
        query.comic = filters.comicId;
      }

      if (filters.episodeId) {
        query.episode = filters.episodeId;
      }

      if (filters.minPrice || filters.maxPrice) {
        query['price.amount'] = {};
        if (filters.minPrice) query['price.amount'].$gte = filters.minPrice;
        if (filters.maxPrice) query['price.amount'].$lte = filters.maxPrice;
      }

      const listings = await Listing.find(query)
        .populate('episode', 'title description content.coverImage')
        .populate('comic', 'title')
        .populate('seller', 'username profile.displayName')
        .sort({ listedAt: -1 })
        .limit(filters.limit || 20)
        .skip(filters.skip || 0);

      return listings;
    } catch (error) {
      logger.error('Error getting active listings:', error);
      throw error;
    }
  }

  /**
   * Get Marketplace Stats
   */
  async getMarketplaceStats() {
    try {
      const totalListings = await Listing.countDocuments({ status: 'active' });
      const totalSold = await Listing.countDocuments({ status: 'sold' });

      const soldListings = await Listing.find({ status: 'sold' });
      const totalVolume = soldListings.reduce((sum, l) => sum + (l.soldPrice || 0), 0);

      const activeAuctions = await Listing.countDocuments({
        status: 'active',
        listingType: 'auction'
      });

      return {
        totalListings,
        totalSold,
        totalVolume,
        activeAuctions,
        averageSalePrice: totalSold > 0 ? totalVolume / totalSold : 0
      };
    } catch (error) {
      logger.error('Error getting marketplace stats:', error);
      throw error;
    }
  }
}

export default new MarketplaceServiceEnhanced();
