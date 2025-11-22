import { Comic, Episode, Listing, ReadHistory, User } from '../models/index.js';
import hederaService from './hederaService.js';
import ipfsService from './ipfsService.js';
import logger from '../utils/logger.js';

/**
 * Enhanced Comic business logic service for Comic Pad
 * Implements complete workflow: Upload → Store → Mint → List → Read
 */
class ComicService {
  /**
   * STEP 1: Create Comic Collection (Project)
   * Creates a new comic series with HTS collection
   */
  async createComic(creatorData) {
    try {
      const {
        userId,
        accountId,
        title,
        description,
        series,
        genres,
        tags,
        coverImage,
        royaltyPercentage,
        maxSupply
      } = creatorData;

      logger.info(`Creating comic collection: ${title}`);

      // Create HTS NFT collection
      const collectionResult = await hederaService.createCollection({
        name: title,
        symbol: title.substring(0, 4).toUpperCase(),
        creatorAccountId: accountId,
        royaltyPercentage: royaltyPercentage || 10,
        maxSupply: maxSupply || 0
      });

      // Upload cover to IPFS if provided
      let coverData = null;
      if (coverImage) {
        coverData = await ipfsService.uploadFile(coverImage, {
          name: `${title}-cover`,
          metadata: { type: 'comic-cover', title }
        });
      }

      // Create comic record in database
      const comic = await Comic.create({
        title,
        description,
        series,
        genres,
        tags,
        creator: userId,
        creatorAccountId: accountId,
        collectionTokenId: collectionResult.tokenId,
        royaltyPercentage: royaltyPercentage || 10,
        maxSupply: maxSupply || 0,
        coverImage: coverData ? {
          ipfsHash: coverData.ipfsHash,
          url: coverData.url
        } : null,
        status: 'draft'
      });

      logger.info(`Comic created successfully: ${comic._id}`);

      return {
        comic,
        tokenId: collectionResult.tokenId,
        explorerUrl: collectionResult.explorerUrl
      };
    } catch (error) {
      logger.error('Error creating comic:', error);
      throw new Error(`Failed to create comic: ${error.message}`);
    }
  }

  /**
   * STEP 2: Upload and Store Episode
   * Handles file upload, IPFS storage, and metadata creation
   */
  async createEpisode(episodeData) {
    try {
      const {
        comicId,
        userId,
        title,
        description,
        episodeNumber,
        coverImage,
        pages,
        mintPrice,
        readPrice,
        maxSupply
      } = episodeData;

      logger.info(`Creating episode ${episodeNumber} for comic ${comicId}`);

      // Get comic
      const comic = await Comic.findById(comicId);
      if (!comic) {
        throw new Error('Comic not found');
      }

      // Verify creator
      if (comic.creator.toString() !== userId) {
        throw new Error('Unauthorized: Not the comic creator');
      }

      // Upload to IPFS
      const comicPackage = await ipfsService.uploadComicPackage({
        pages,
        coverImage,
        metadata: {
          name: `${comic.title} - Episode ${episodeNumber}`,
          description,
          series: comic.title,
          issueNumber: episodeNumber
        },
        comicId: `${comic._id}-ep${episodeNumber}`
      });

      // Create NFT metadata JSON with proper structure
      const nftMetadata = {
        name: `${comic.title} - Episode ${episodeNumber}`,
        description,
        creator: comic.creatorAccountId,
        image: `ipfs://${comicPackage.cover.ipfsHash}`,
        properties: {
          series: comic.title,
          episodeNumber,
          totalPages: pages.length,
          contentUri: comicPackage.metadataUri,
          coverImage: `ipfs://${comicPackage.cover.ipfsHash}`,
          format: 'comic',
          type: 'NFT Comic Episode'
        },
        attributes: [
          {
            trait_type: 'Series',
            value: comic.title
          },
          {
            trait_type: 'Episode Number',
            value: episodeNumber
          },
          {
            trait_type: 'Page Count',
            value: pages.length
          },
          {
            trait_type: 'Creator',
            value: comic.creatorAccountId
          }
        ]
      };

      // Upload NFT metadata to IPFS
      const metadataUpload = await ipfsService.uploadJSON(
        nftMetadata,
        `${comic._id}-ep${episodeNumber}-metadata.json`
      );

      // Create episode record
      const episode = await Episode.create({
        title,
        description,
        episodeNumber,
        comic: comicId,
        creator: userId,
        collectionTokenId: comic.collectionTokenId,
        content: {
          metadataUri: metadataUpload.url,
          metadataHash: metadataUpload.ipfsHash,
          coverImage: comicPackage.cover,
          pages: comicPackage.pages.pages.map(p => ({
            pageNumber: p.pageNumber,
            ipfsHash: p.original.ipfsHash,
            url: p.original.url,
            thumbnail: p.thumbnail.url
          })),
          cbz: comicPackage.cbz,
          totalPages: pages.length
        },
        pricing: {
          mintPrice: mintPrice || 0,
          readPrice: readPrice || 0,
          currency: 'HBAR'
        },
        supply: {
          maxSupply: maxSupply || 0,
          currentSupply: 0
        },
        status: 'ready',
        isLive: true, // Enable minting immediately for creator
        mintingRules: {
          enabled: true // Enable minting
        },
        publishedAt: new Date()
      });

      // Update comic stats
      await comic.incrementStats('totalEpisodes');

      logger.info(`Episode created successfully: ${episode._id}`);

      return {
        episode,
        ipfsData: comicPackage,
        metadataUri: metadataUpload.url
      };
    } catch (error) {
      logger.error('Error creating episode:', error);
      throw new Error(`Failed to create episode: ${error.message}`);
    }
  }

  /**
   * Record Already-Minted NFTs (Frontend Minting)
   * Records NFTs that were minted on the frontend via wallet
   */
  async recordMintedNFTs(mintData) {
    try {
      const {
        episodeId,
        buyerAccountId,
        serialNumbers,
        transactionId
      } = mintData;

      logger.info(`Recording ${serialNumbers.length} minted NFT(s) for episode ${episodeId}`);

      // Get episode
      const episode = await Episode.findById(episodeId).populate('comic');
      if (!episode) {
        throw new Error('Episode not found');
      }

      // Record each minted NFT
      for (const serialNumber of serialNumbers) {
        await episode.addMintedNFT(
          serialNumber,
          buyerAccountId,
          transactionId
        );
      }

      // Update comic stats
      await episode.comic.incrementStats('totalMinted', serialNumbers.length);

      logger.info(`Recorded ${serialNumbers.length} NFTs successfully`);

      return {
        episode,
        mintedNFTs: serialNumbers,
        transactionId,
        explorerUrl: `https://hashscan.io/testnet/transaction/${transactionId}`
      };
    } catch (error) {
      logger.error('Error recording minted NFTs:', error);
      throw new Error(`Failed to record minted NFTs: ${error.message}`);
    }
  }

  /**
   * STEP 3: Mint NFT for Episode
   * Mints NFTs on Hedera and records ownership
   */
  async mintEpisodeNFT(mintData) {
    try {
      const {
        episodeId,
        buyerAccountId,
        quantity
      } = mintData;

      logger.info(`Minting ${quantity} NFT(s) for episode ${episodeId}`);

      // Get episode
      const episode = await Episode.findById(episodeId).populate('comic');
      if (!episode) {
        throw new Error('Episode not found');
      }

      // Check if minting is enabled
      if (!episode.isLive) {
        throw new Error('Episode is not live for minting');
      }

      // Check supply limits
      if (episode.supply.maxSupply > 0) {
        const remaining = episode.supply.maxSupply - episode.supply.currentSupply;
        if (quantity > remaining) {
          throw new Error(`Only ${remaining} NFTs remaining`);
        }
      }

      // Mint on Hedera
      const mintResult = await hederaService.mintNFTs({
        tokenId: episode.collectionTokenId,
        metadata: episode.content.metadataHash,
        quantity
      });

      // Record minted NFTs
      for (const serialNumber of mintResult.serialNumbers) {
        await episode.addMintedNFT(
          serialNumber,
          buyerAccountId,
          mintResult.transactionId
        );
      }

      // Update comic stats
      await episode.comic.incrementStats('totalMinted', quantity);

      logger.info(`Minted ${quantity} NFTs successfully`);

      return {
        episode,
        mintedNFTs: mintResult.serialNumbers,
        transactionId: mintResult.transactionId,
        explorerUrl: mintResult.explorerUrl
      };
    } catch (error) {
      logger.error('Error minting episode NFT:', error);
      throw new Error(`Failed to mint NFT: ${error.message}`);
    }
  }

  /**
   * STEP 4: Publish Episode (Go Live)
   * Makes episode available for minting
   */
  async publishEpisode(episodeId, mintingConfig) {
    try {
      const episode = await Episode.findById(episodeId);
      if (!episode) {
        throw new Error('Episode not found');
      }

      // Update minting rules
      episode.mintingRules = {
        enabled: true,
        startTime: mintingConfig.startTime || new Date(),
        endTime: mintingConfig.endTime,
        maxPerWallet: mintingConfig.maxPerWallet || 0,
        whitelistOnly: mintingConfig.whitelistOnly || false,
        whitelist: mintingConfig.whitelist || []
      };

      episode.isLive = true;
      episode.status = 'published';
      episode.publishedAt = new Date();

      await episode.save();

      logger.info(`Episode ${episodeId} published successfully`);

      return episode;
    } catch (error) {
      logger.error('Error publishing episode:', error);
      throw new Error(`Failed to publish episode: ${error.message}`);
    }
  }

  /**
   * STEP 5: Verify Access and Track Reading
   * Checks ownership and creates read history
   */
  async verifyEpisodeAccess(episodeId, userAccountId, userId) {
    try {
      const episode = await Episode.findById(episodeId).populate('comic');
      if (!episode) {
        throw new Error('Episode not found');
      }

      // Check if user is the creator (creators can always read their own comics)
      const isCreator = episode.creator && episode.creator.toString() === userId.toString();

      // Check access rights
      const hasAccess = isCreator || await episode.canAccess(userAccountId);

      if (!hasAccess && hasAccess !== 'preview') {
        return {
          hasAccess: false,
          accessType: 'none',
          message: 'You need to own an NFT or pay to access this content'
        };
      }

      // Determine access type
      let accessType = 'preview';
      let nftOwnership = null;

      if (hasAccess === true || isCreator) {
        // Find owned NFT
        const ownedNFT = episode.mintedNFTs.find(nft => nft.owner === userAccountId);
        if (ownedNFT || isCreator) {
          accessType = 'nft-owner'; // Both NFT owners and creators get full access
          nftOwnership = ownedNFT ? {
            tokenId: episode.collectionTokenId,
            serialNumber: ownedNFT.serialNumber
          } : null; // Creators don't have NFT serial - set to null
        }
      }

      // Create or update read history
      let readHistory = await ReadHistory.findOne({
        user: userId,
        episode: episodeId
      });

      if (!readHistory) {
        readHistory = await ReadHistory.create({
          user: userId,
          userAccountId,
          comic: episode.comic,
          episode: episodeId,
          accessType,
          nftTokenId: nftOwnership?.tokenId,
          nftSerialNumber: nftOwnership?.serialNumber,
          progress: {
            totalPages: episode.content.totalPages
          }
        });

        // Increment unique readers
        await episode.incrementStats('uniqueReaders');
      }

      // Increment read count
      await episode.incrementStats('totalReads');

      return {
        hasAccess: true,
        accessType,
        nftOwnership,
        episode: accessType === 'nft-owner' ? episode : null,
        progress: readHistory?.progress || null
      };
    } catch (error) {
      logger.error('Error verifying episode access:', error);
      throw new Error(`Failed to verify access: ${error.message}`);
    }
  }
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