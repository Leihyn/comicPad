import { Comic, Collection, User, Transaction } from '../models/index.js';
import hederaService from './hederaService.js';
import ipfsService from './ipfsService.js';
import logger from '../utils/logger.js';

/**
 * Comic business logic service
 */
class ComicService {
  /**
   * Get trending comics
   */
  async getTrendingComics(limit = 10) {
    try {
      const comics = await Comic.find({ status: 'published' })
        .sort({ 'stats.views': -1, 'stats.favorites': -1 })
        .limit(limit)
        .populate('creator', 'username profile')
        .populate('collection', 'name symbol');

      return comics;
    } catch (error) {
      logger.error('Error getting trending comics:', error);
      throw error;
    }
  }

  /**
   * Get featured comics
   */
  async getFeaturedComics(limit = 8) {
    try {
      const comics = await Comic.find({
        status: 'published',
        'stats.sales': { $gte: 10 }
      })
        .sort({ 'stats.totalVolume': -1 })
        .limit(limit)
        .populate('creator', 'username profile')
        .populate('collection', 'name symbol');

      return comics;
    } catch (error) {
      logger.error('Error getting featured comics:', error);
      throw error;
    }
  }

  /**
   * Get new releases
   */
  async getNewReleases(limit = 12) {
    try {
      const comics = await Comic.find({ status: 'published' })
        .sort({ publishedAt: -1 })
        .limit(limit)
        .populate('creator', 'username profile')
        .populate('collection', 'name symbol');

      return comics;
    } catch (error) {
      logger.error('Error getting new releases:', error);
      throw error;
    }
  }

  /**
   * Get similar comics
   */
  async getSimilarComics(comicId, limit = 6) {
    try {
      const comic = await Comic.findById(comicId);
      if (!comic) return [];

      const similar = await Comic.find({
        _id: { $ne: comicId },
        status: 'published',
        $or: [
          { genre: { $in: comic.genre } },
          { category: comic.category },
          { series: comic.series }
        ]
      })
        .limit(limit)
        .populate('creator', 'username profile')
        .populate('collection', 'name symbol');

      return similar;
    } catch (error) {
      logger.error('Error getting similar comics:', error);
      throw error;
    }
  }

  /**
   * Get comic stats
   */
  async getComicStats(comicId) {
    try {
      const comic = await Comic.findById(comicId);
      if (!comic) throw new Error('Comic not found');

      const transactions = await Transaction.find({
        comic: comicId,
        status: 'completed'
      });

      const sales = transactions.length;
      const totalVolume = transactions.reduce((sum, tx) => sum + tx.price, 0);
      const averagePrice = sales > 0 ? totalVolume / sales : 0;

      const priceHistory = transactions.map(tx => ({
        date: tx.createdAt,
        price: tx.price,
        type: tx.type
      }));

      return {
        views: comic.stats.views,
        favorites: comic.stats.favorites,
        sales,
        totalVolume,
        averagePrice,
        minted: comic.minted,
        supply: comic.supply,
        availableSupply: comic.supply - comic.minted,
        priceHistory
      };
    } catch (error) {
      logger.error('Error getting comic stats:', error);
      throw error;
    }
  }

  /**
   * Verify NFT ownership
   */
  async verifyOwnership(comicId, userId) {
    try {
      const comic = await Comic.findById(comicId);
      if (!comic) return false;

      return comic.nfts.some(nft => nft.owner.toString() === userId);
    } catch (error) {
      logger.error('Error verifying ownership:', error);
      return false;
    }
  }

  /**
   * Get user's owned NFTs for a comic
   */
  async getUserOwnedNFTs(comicId, userId) {
    try {
      const comic = await Comic.findById(comicId);
      if (!comic) return [];

      return comic.nfts.filter(nft => nft.owner.toString() === userId);
    } catch (error) {
      logger.error('Error getting user NFTs:', error);
      return [];
    }
  }

  /**
   * Update comic stats
   */
  async updateStats(comicId, updates) {
    try {
      await Comic.findByIdAndUpdate(
        comicId,
        { $inc: { ...updates } },
        { new: true }
      );
    } catch (error) {
      logger.error('Error updating comic stats:', error);
    }
  }

  /**
   * Get collection stats
   */
  async getCollectionStats(collectionId) {
    try {
      const collection = await Collection.findById(collectionId);
      if (!collection) throw new Error('Collection not found');

      const comics = await Comic.find({ collection: collectionId });
      const totalComics = comics.length;
      const publishedComics = comics.filter(c => c.status === 'published').length;
      const totalMinted = comics.reduce((sum, c) => sum + c.minted, 0);
      const totalViews = comics.reduce((sum, c) => sum + c.stats.views, 0);

      const transactions = await Transaction.find({
        comic: { $in: comics.map(c => c._id) },
        status: 'completed'
      });

      const totalVolume = transactions.reduce((sum, tx) => sum + tx.price, 0);
      const totalSales = transactions.length;

      return {
        totalComics,
        publishedComics,
        totalMinted,
        totalViews,
        totalVolume,
        totalSales,
        floorPrice: collection.floorPrice || 0
      };
    } catch (error) {
      logger.error('Error getting collection stats:', error);
      throw error;
    }
  }

  /**
   * Update collection floor price
   */
  async updateFloorPrice(collectionId) {
    try {
      const Listing = (await import('../models/index.js')).Listing;
      
      const lowestListing = await Listing.findOne({
        'collection._id': collectionId,
        status: 'active',
        listingType: 'fixed-price'
      })
        .sort({ price: 1 })
        .limit(1);

      const floorPrice = lowestListing ? lowestListing.price : 0;

      await Collection.findByIdAndUpdate(
        collectionId,
        { $set: { floorPrice } }
      );

      return floorPrice;
    } catch (error) {
      logger.error('Error updating floor price:', error);
      return 0;
    }
  }

  /**
   * Search comics
   */
  async searchComics(query, filters = {}) {
    try {
      const searchQuery = {
        status: 'published',
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { series: { $regex: query, $options: 'i' } },
          { genre: { $regex: query, $options: 'i' } }
        ]
      };

      if (filters.genre) {
        searchQuery.genre = { $in: filters.genre };
      }

      if (filters.minPrice || filters.maxPrice) {
        searchQuery.price = {};
        if (filters.minPrice) searchQuery.price.$gte = filters.minPrice;
        if (filters.maxPrice) searchQuery.price.$lte = filters.maxPrice;
      }

      if (filters.edition) {
        searchQuery.edition = filters.edition;
      }

      const comics = await Comic.find(searchQuery)
        .populate('creator', 'username profile')
        .populate('collection', 'name symbol')
        .limit(filters.limit || 20)
        .skip(filters.skip || 0)
        .sort({ score: { $meta: 'textScore' } });

      return comics;
    } catch (error) {
      logger.error('Error searching comics:', error);
      throw error;
    }
  }

  /**
   * Get creator's best selling comics
   */
  async getCreatorBestSellers(creatorId, limit = 5) {
    try {
      const comics = await Comic.find({
        creator: creatorId,
        status: 'published'
      })
        .sort({ 'stats.sales': -1, 'stats.totalVolume': -1 })
        .limit(limit)
        .populate('collection', 'name symbol');

      return comics;
    } catch (error) {
      logger.error('Error getting creator best sellers:', error);
      throw error;
    }
  }

  /**
   * Get creator earnings
   */
  async getCreatorEarnings(creatorId) {
    try {
      const transactions = await Transaction.find({
        'from.user': creatorId,
        status: 'completed'
      });

      const primarySales = transactions.filter(tx => tx.type === 'sale' || tx.type === 'mint');
      const royalties = transactions.filter(tx => tx.type === 'royalty');

      const totalEarnings = transactions.reduce((sum, tx) => sum + tx.price, 0);
      const primaryEarnings = primarySales.reduce((sum, tx) => sum + tx.price, 0);
      const royaltyEarnings = royalties.reduce((sum, tx) => sum + tx.royaltyFee, 0);

      return {
        totalEarnings,
        primaryEarnings,
        royaltyEarnings,
        totalSales: transactions.length,
        primarySales: primarySales.length,
        royaltySales: royalties.length
      };
    } catch (error) {
      logger.error('Error getting creator earnings:', error);
      throw error;
    }
  }
}

export default new ComicService();