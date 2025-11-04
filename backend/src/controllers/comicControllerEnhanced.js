// backend/src/controllers/comicControllerEnhanced.js
import comicService from '../services/comicService.js';
import { Comic, Episode } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Enhanced Comic Controller
 * Handles all comic and episode operations
 */

/**
 * Create new comic collection
 * POST /api/comics
 * Supports two modes:
 * 1. Backend creates collection (provide title, description, etc.)
 * 2. User already created collection (provide tokenId from frontend)
 */
export const createComic = async (req, res) => {
  try {
    const {
      // Standard fields
      title,
      name, // Frontend might send 'name' instead of 'title'
      description,
      series,
      genres,
      tags,
      royaltyPercentage,
      maxSupply,
      // User-created collection fields
      tokenId,
      symbol,
      transactionId,
      treasuryAccountId,
      // Episode/Comic issue fields
      collectionId,
      genre,
      issueNumber,
      price,
      supply,
      edition
    } = req.body;

    const userId = req.user.id;
    const accountId = req.user.wallet?.accountId;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Hedera wallet not connected'
      });
    }

    // Use 'name' if 'title' not provided (frontend compatibility)
    const comicTitle = title || name;

    if (!comicTitle) {
      return res.status(400).json({
        success: false,
        message: 'Title or name is required'
      });
    }

    // If collectionId is provided, this is creating an episode (comic issue)
    if (collectionId) {
      logger.info(`Creating episode for collection: ${collectionId}`);

      // Auto-increment episode number by finding the last episode
      const lastEpisode = await Episode.findOne({ comic: collectionId })
        .sort({ episodeNumber: -1 })
        .select('episodeNumber');

      const nextEpisodeNumber = lastEpisode ? lastEpisode.episodeNumber + 1 : 1;
      logger.info(`Next episode number for collection ${collectionId}: ${nextEpisodeNumber}`);

      // Normalize field names for createEpisode handler
      req.params.comicId = collectionId;
      req.body.episodeNumber = nextEpisodeNumber; // Use auto-incremented number
      req.body.mintPrice = req.body.price || 0;
      req.body.readPrice = 0; // Free to read if you own the NFT
      req.body.maxSupply = req.body.supply || 1;

      // Redirect to createEpisode handler
      return await createEpisode(req, res);
    }

    // Check if user already created the collection on frontend
    if (tokenId) {
      // User already created collection - just save to database
      logger.info(`Saving user-created collection: ${comicTitle} (${tokenId})`);
      logger.info(`Request body:`, JSON.stringify(req.body));

      try {
        const comic = await Comic.create({
          title: comicTitle,
          description: description || '',
          series: series || '',
          genres: genres || [],
          tags: tags || [],
          creator: userId,
          creatorAccountId: treasuryAccountId || accountId,
          collectionTokenId: tokenId,
          royaltyPercentage: parseInt(royaltyPercentage) || 10,
          maxSupply: parseInt(maxSupply) || 0,
          coverImage: req.file ? {
            ipfsHash: '',
            url: req.file.path
          } : null,
          status: 'draft'
        });

        logger.info(`Collection saved successfully: ${comic._id}`);

        return res.status(201).json({
          success: true,
          message: 'Collection saved successfully',
          data: {
            collection: comic,
            tokenId,
            explorerUrl: `https://hashscan.io/testnet/token/${tokenId}`
          }
        });
      } catch (dbError) {
        logger.error('Database error saving collection:', dbError);
        logger.error('Validation errors:', dbError.errors);
        return res.status(500).json({
          success: false,
          message: `Database error: ${dbError.message}`,
          details: dbError.errors
        });
      }
    }

    // Backend creates the collection
    const result = await comicService.createComic({
      userId,
      accountId,
      title: comicTitle,
      description,
      series,
      genres,
      tags,
      coverImage: req.file?.path,
      royaltyPercentage,
      maxSupply
    });

    res.status(201).json({
      success: true,
      message: 'Comic collection created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in createComic controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create new episode
 * POST /api/comics/:comicId/episodes
 */
export const createEpisode = async (req, res) => {
  try {
    const { comicId } = req.params;
    const {
      title,
      description,
      episodeNumber,
      mintPrice,
      readPrice,
      maxSupply
    } = req.body;

    const userId = req.user.id;

    // Get uploaded files
    const files = req.files;
    const coverImage = files.cover?.[0]?.path;
    const pages = files.pages?.map(f => ({ path: f.path })) || [];

    if (!coverImage || pages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cover image and pages are required'
      });
    }

    const result = await comicService.createEpisode({
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
    });

    res.status(201).json({
      success: true,
      message: 'Episode created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in createEpisode controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Publish episode (make it live for minting)
 * POST /api/episodes/:episodeId/publish
 */
export const publishEpisode = async (req, res) => {
  try {
    const { episodeId } = req.params;
    const {
      startTime,
      endTime,
      maxPerWallet,
      whitelistOnly,
      whitelist
    } = req.body;

    const episode = await comicService.publishEpisode(episodeId, {
      startTime,
      endTime,
      maxPerWallet,
      whitelistOnly,
      whitelist
    });

    res.json({
      success: true,
      message: 'Episode published successfully',
      data: episode
    });
  } catch (error) {
    logger.error('Error in publishEpisode controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Mint NFT for episode
 * POST /api/episodes/:episodeId/mint
 */
export const mintEpisodeNFT = async (req, res) => {
  try {
    const { episodeId } = req.params;
    const { quantity = 1, serialNumbers, transactionId } = req.body;

    const buyerAccountId = req.user.wallet?.accountId;

    if (!buyerAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Hedera wallet not connected'
      });
    }

    // If serialNumbers are provided, NFTs were already minted on frontend
    // Just record the results
    if (serialNumbers && serialNumbers.length > 0) {
      const result = await comicService.recordMintedNFTs({
        episodeId,
        buyerAccountId,
        serialNumbers,
        transactionId
      });

      return res.json({
        success: true,
        message: `Recorded ${serialNumbers.length} minted NFT(s) successfully`,
        data: result
      });
    }

    // Otherwise, mint on backend (legacy flow)
    const result = await comicService.mintEpisodeNFT({
      episodeId,
      buyerAccountId,
      quantity
    });

    res.json({
      success: true,
      message: `Minted ${quantity} NFT(s) successfully`,
      data: result
    });
  } catch (error) {
    logger.error('Error in mintEpisodeNFT controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get comic by ID
 * GET /api/comics/:comicId
 */
export const getComic = async (req, res) => {
  try {
    const { comicId } = req.params;

    const comic = await Comic.findById(comicId)
      .populate('creator', 'username profile wallet')
      .populate({
        path: 'episodes',
        options: { sort: { episodeNumber: 1 } }
      });

    if (!comic) {
      return res.status(404).json({
        success: false,
        message: 'Comic not found'
      });
    }

    res.json({
      success: true,
      data: comic
    });
  } catch (error) {
    logger.error('Error in getComic controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all comics (with filters)
 * GET /api/comics
 */
export const getComics = async (req, res) => {
  try {
    const {
      status,
      genre,
      creator,
      limit = 20,
      skip = 0,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (genre) query.genres = { $in: [genre] };
    if (creator) query.creator = creator;

    const comics = await Comic.find(query)
      .populate('creator', 'username profile')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Comic.countDocuments(query);

    res.json({
      success: true,
      data: {
        collections: comics, // Return as 'collections' for clarity
        comics,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: total > parseInt(skip) + parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error in getComics controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get episode by ID
 * GET /api/episodes/:episodeId
 */
export const getEpisode = async (req, res) => {
  try {
    const { episodeId } = req.params;

    const episode = await Episode.findById(episodeId)
      .populate('comic', 'title description coverImage')
      .populate('creator', 'username profile');

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found'
      });
    }

    res.json({
      success: true,
      data: episode
    });
  } catch (error) {
    logger.error('Error in getEpisode controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Verify episode access and get reading content
 * GET /api/episodes/:episodeId/read
 */
export const readEpisode = async (req, res) => {
  try {
    const { episodeId } = req.params;
    const userId = req.user.id;
    const userAccountId = req.user.wallet?.accountId;

    if (!userAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Hedera wallet not connected'
      });
    }

    const accessData = await comicService.verifyEpisodeAccess(
      episodeId,
      userAccountId,
      userId
    );

    if (!accessData.hasAccess) {
      return res.status(403).json({
        success: false,
        message: accessData.message
      });
    }

    res.json({
      success: true,
      data: accessData
    });
  } catch (error) {
    logger.error('Error in readEpisode controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update reading progress
 * PUT /api/episodes/:episodeId/progress
 */
export const updateReadingProgress = async (req, res) => {
  try {
    const { episodeId } = req.params;
    const { currentPage, totalPages } = req.body;
    const userId = req.user.id;

    const { ReadHistory } = await import('../models/index.js');

    const readHistory = await ReadHistory.findOne({
      user: userId,
      episode: episodeId
    });

    if (!readHistory) {
      return res.status(404).json({
        success: false,
        message: 'Read history not found'
      });
    }

    await readHistory.updateProgress(currentPage, totalPages);

    res.json({
      success: true,
      message: 'Progress updated',
      data: readHistory
    });
  } catch (error) {
    logger.error('Error in updateReadingProgress controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user's comics (creator)
 * GET /api/users/me/comics
 */
export const getMyComics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch episodes (comic issues) created by user, with collection info
    const episodes = await Episode.find({ creator: userId })
      .populate('comic', 'title collectionTokenId')
      .sort('-createdAt');

    // Transform episodes to match frontend expectations
    const comics = episodes.map(episode => ({
      _id: episode._id,
      title: episode.title,
      description: episode.description,
      episodeNumber: episode.episodeNumber,
      content: {
        coverImage: episode.content?.coverImage?.url || episode.content?.coverImage?.ipfsHash,
        metadataUri: episode.content?.metadataUri
      },
      price: episode.pricing?.mintPrice || 0,
      minted: episode.stats?.totalMinted || 0,
      supply: episode.supply?.maxSupply || 0,
      status: episode.status,
      collection: episode.comic, // Parent collection
      collectionTokenId: episode.collectionTokenId,
      creator: episode.creator?.toString() || episode.creator, // Convert ObjectId to string
      nfts: episode.mintedNFTs || [], // Add NFTs array for modal
      createdAt: episode.createdAt
    }));

    res.json({
      success: true,
      data: {
        comics
      }
    });
  } catch (error) {
    logger.error('Error in getMyComics controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user's owned NFTs
 * GET /api/users/me/collection
 */
export const getMyCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const userAccountId = req.user.wallet?.accountId;

    if (!userAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Hedera wallet not connected'
      });
    }

    // Find all episodes where user owns NFTs
    const episodes = await Episode.find({
      'mintedNFTs.owner': userAccountId
    }).populate('comic', 'title coverImage');

    // Transform episodes to match frontend expectations
    const collection = episodes.map(episode => {
      const ownedNFTs = episode.mintedNFTs.filter(
        nft => nft.owner === userAccountId
      );

      return {
        _id: episode._id,
        title: episode.title,
        description: episode.description,
        episodeNumber: episode.episodeNumber,
        content: {
          coverImage: episode.content?.coverImage?.url || episode.content?.coverImage?.ipfsHash,
          metadataUri: episode.content?.metadataUri
        },
        price: episode.pricing?.mintPrice || 0,
        minted: episode.stats?.totalMinted || 0,
        supply: episode.supply?.maxSupply || 0,
        status: episode.status,
        collection: episode.comic, // Parent collection
        collectionTokenId: episode.collectionTokenId,
        creator: episode.creator?.toString() || episode.creator, // Convert ObjectId to string
        nfts: ownedNFTs, // User's owned NFTs
        createdAt: episode.createdAt
      };
    });

    res.json({
      success: true,
      data: {
        comics: collection
      }
    });
  } catch (error) {
    logger.error('Error in getMyCollection controller:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  createComic,
  createEpisode,
  publishEpisode,
  mintEpisodeNFT,
  getComic,
  getComics,
  getEpisode,
  readEpisode,
  updateReadingProgress,
  getMyComics,
  getMyCollection
};
