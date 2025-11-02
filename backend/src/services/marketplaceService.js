import { Listing, Comic, Transaction, Offer } from '../models/index.js';
import hederaService from './hederaService.js';
import logger from '../utils/logger.js';

/**
 * Marketplace business logic service
 */
class MarketplaceService {
  /**
   * Calculate platform fee
   */
  calculatePlatformFee(price) {
    const feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 2.5;
    return (price * feePercentage) / 100;
  }

  /**
   * Calculate royalty fee
   */
  calculateRoyaltyFee(price, royaltyPercentage) {
    return (price * royaltyPercentage) / 100;
  }

  /**
   * Process NFT sale
   */
  async processSale(listing, buyer, buyerAccountId) {
    try {
      const comic = listing.comic;
      const seller = listing.seller;
      const price = listing.price;

      // Transfer NFT on Hedera
      const transfer = await hederaService.transferNFT({
        tokenId: listing.tokenId,
        serialNumber: listing.serialNumber,
        fromAccountId: listing.sellerAccountId,
        toAccountId: buyerAccountId,
        price
      });

      // Calculate fees
      const platformFee = this.calculatePlatformFee(price);
      const royaltyFee = this.calculateRoyaltyFee(
        price,
        comic.collection.royaltyPercentage
      );

      // Update NFT ownership
      const nft = comic.nfts.find(n => n.serialNumber === listing.serialNumber);
      nft.owner = buyer;
      nft.ownerAccountId = buyerAccountId;
      await comic.save();

      // Create transaction record
      const transaction = await Transaction.create({
        type: 'sale',
        comic: comic._id,
        tokenId: listing.tokenId,
        serialNumber: listing.serialNumber,
        from: {
          user: seller._id,
          accountId: listing.sellerAccountId
        },
        to: {
          user: buyer,
          accountId: buyerAccountId
        },
        price,
        currency: 'HBAR',
        platformFee,
        royaltyFee,
        transactionId: transfer.transactionId,
        explorerUrl: transfer.explorerUrl,
        status: 'completed'
      });

      // Update stats
      comic.stats.sales += 1;
      comic.stats.totalVolume += price;
      await comic.save();

      return {
        transaction,
        transfer
      };
    } catch (error) {
      logger.error('Error processing sale:', error);
      throw error;
    }
  }

  /**
   * Process auction completion
   */
  async processAuctionCompletion(listing) {
    try {
      if (!listing.auction.highestBidder) {
        throw new Error('No bids on auction');
      }

      return await this.processSale(
        listing,
        listing.auction.highestBidder,
        listing.auction.highestBidderAccountId
      );
    } catch (error) {
      logger.error('Error processing auction:', error);
      throw error;
    }
  }

  /**
   * Check and expire old listings
   */
  async expireOldListings() {
    try {
      const expiredAuctions = await Listing.find({
        listingType: 'auction',
        status: 'active',
        'auction.endTime': { $lt: new Date() }
      });

      for (const listing of expiredAuctions) {
        if (listing.auction.currentBid >= listing.auction.reservePrice) {
          // Complete auction
          await this.processAuctionCompletion(listing);
          listing.status = 'sold';
        } else {
          // No reserve met
          listing.status = 'expired';
        }
        await listing.save();
      }

      logger.info(`Expired ${expiredAuctions.length} old auctions`);
    } catch (error) {
      logger.error('Error expiring listings:', error);
    }
  }

  /**
   * Get marketplace stats
   */
  async getMarketplaceStats() {
    try {
      const activeListings = await Listing.countDocuments({ status: 'active' });
      const totalSales = await Transaction.countDocuments({ status: 'completed' });

      const volumeData = await Transaction.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$price' },
            averagePrice: { $avg: '$price' }
          }
        }
      ]);

      const volume = volumeData.length > 0 ? volumeData[0] : { totalVolume: 0, averagePrice: 0 };

      // Get 24h volume
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

      const dailyData = volume24h.length > 0 ? volume24h[0] : { volume: 0, sales: 0 };

      return {
        activeListings,
        totalSales,
        totalVolume: volume.totalVolume,
        averagePrice: volume.averagePrice,
        volume24h: dailyData.volume,
        sales24h: dailyData.sales
      };
    } catch (error) {
      logger.error('Error getting marketplace stats:', error);
      throw error;
    }
  }

  /**
   * Get trending listings
   */
  async getTrendingListings(limit = 10) {
    try {
      const listings = await Listing.find({
        status: 'active',
        listingType: 'fixed-price'
      })
        .populate('comic', 'title content.coverImage stats')
        .populate('seller', 'username profile')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit);

      return listings;
    } catch (error) {
      logger.error('Error getting trending listings:', error);
      throw error;
    }
  }

  /**
   * Get active auctions
   */
  async getActiveAuctions(limit = 10) {
    try {
      const auctions = await Listing.find({
        status: 'active',
        listingType: 'auction',
        'auction.endTime': { $gt: new Date() }
      })
        .populate('comic', 'title content.coverImage')
        .populate('seller', 'username profile')
        .sort({ 'auction.endTime': 1 })
        .limit(limit);

      return auctions;
    } catch (error) {
      logger.error('Error getting active auctions:', error);
      throw error;
    }
  }

  /**
   * Get ending soon auctions
   */
  async getEndingSoonAuctions(hours = 24, limit = 10) {
    try {
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + hours);

      const auctions = await Listing.find({
        status: 'active',
        listingType: 'auction',
        'auction.endTime': {
          $gt: new Date(),
          $lt: endTime
        }
      })
        .populate('comic', 'title content.coverImage')
        .populate('seller', 'username profile')
        .sort({ 'auction.endTime': 1 })
        .limit(limit);

      return auctions;
    } catch (error) {
      logger.error('Error getting ending soon auctions:', error);
      throw error;
    }
  }

  /**
   * Get price history for comic
   */
  async getPriceHistory(comicId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const transactions = await Transaction.find({
        comic: comicId,
        status: 'completed',
        createdAt: { $gte: startDate }
      })
        .sort({ createdAt: 1 })
        .select('price createdAt serialNumber');

      return transactions.map(tx => ({
        date: tx.createdAt,
        price: tx.price,
        serialNumber: tx.serialNumber
      }));
    } catch (error) {
      logger.error('Error getting price history:', error);
      throw error;
    }
  }

  /**
   * Get offers for comic
   */
  async getOffersForComic(comicId) {
    try {
      const offers = await Offer.find({
        comic: comicId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      })
        .populate('offerer', 'username profile')
        .sort({ amount: -1 });

      return offers;
    } catch (error) {
      logger.error('Error getting offers:', error);
      throw error;
    }
  }

  /**
   * Get user's received offers
   */
  async getReceivedOffers(userId) {
    try {
      const offers = await Offer.find({
        owner: userId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      })
        .populate('offerer', 'username profile')
        .populate('comic', 'title content.coverImage')
        .sort({ createdAt: -1 });

      return offers;
    } catch (error) {
      logger.error('Error getting received offers:', error);
      throw error;
    }
  }

  /**
   * Get user's made offers
   */
  async getMadeOffers(userId) {
    try {
      const offers = await Offer.find({
        offerer: userId,
        expiresAt: { $gt: new Date() }
      })
        .populate('owner', 'username profile')
        .populate('comic', 'title content.coverImage')
        .sort({ createdAt: -1 });

      return offers;
    } catch (error) {
      logger.error('Error getting made offers:', error);
      throw error;
    }
  }

  /**
   * Cancel expired offers
   */
  async cancelExpiredOffers() {
    try {
      const result = await Offer.updateMany(
        {
          status: 'pending',
          expiresAt: { $lt: new Date() }
        },
        {
          $set: { status: 'expired' }
        }
      );

      logger.info(`Cancelled ${result.modifiedCount} expired offers`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error cancelling expired offers:', error);
      return 0;
    }
  }

  /**
   * Get collection floor price
   */
  async getCollectionFloorPrice(collectionId) {
    try {
      const lowestListing = await Listing.findOne({
        'comic.collection': collectionId,
        status: 'active',
        listingType: 'fixed-price'
      })
        .sort({ price: 1 })
        .limit(1);

      return lowestListing ? lowestListing.price : null;
    } catch (error) {
      logger.error('Error getting floor price:', error);
      return null;
    }
  }

  /**
   * Get similar listings
   */
  async getSimilarListings(comicId, limit = 6) {
    try {
      const comic = await Comic.findById(comicId).populate('collection');
      if (!comic) return [];

      const similar = await Listing.find({
        'comic._id': { $ne: comicId },
        status: 'active',
        $or: [
          { 'comic.collection': comic.collection._id },
          { 'comic.genre': { $in: comic.genre } }
        ]
      })
        .populate('comic', 'title content.coverImage')
        .populate('seller', 'username profile')
        .limit(limit);

      return similar;
    } catch (error) {
      logger.error('Error getting similar listings:', error);
      return [];
    }
  }
}

export default new MarketplaceService();