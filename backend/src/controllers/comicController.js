// backend/src/controllers/comicController.js
import { Comic, Collection, User } from '../models/index.js';
import hederaService from '../services/hederaService.js';
import ipfsService from '../services/ipfsService.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { cleanupFiles } from '../middleware/upload.js';

/**
 * @desc    Save NFT collection metadata (collection already created on frontend)
 * @route   POST /api/v1/comics/collections
 * @access  Private (Creator + Wallet)
 */
export const createCollection = asyncHandler(async (req, res) => {
  const {
    name,
    symbol,
    description,
    royaltyPercentage,
    maxSupply,
    category,
    tags,
    tokenId,
    transactionId,
    treasuryAccountId
  } = req.body;

  const userId = req.user.id;

  try {
    // Validate that tokenId was provided (collection must be created on frontend first)
    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Token ID is required. Collection must be created on Hedera first.'
      });
    }

    // Validate that the treasuryAccountId matches the user's connected wallet
    if (treasuryAccountId && req.user.hederaAccount.accountId !== treasuryAccountId) {
      return res.status(403).json({
        success: false,
        message: 'Treasury account must match your connected wallet'
      });
    }

    // Check if tokenId already exists
    const existingCollection = await Collection.findOne({ tokenId });
    if (existingCollection) {
      return res.status(400).json({
        success: false,
        message: 'Collection with this token ID already exists'
      });
    }

    // Upload cover image to IPFS if provided
    let coverImage;
    if (req.files?.coverImage) {
      const upload = await ipfsService.uploadFile(
        req.files.coverImage[0].path,
        {
          metadata: {
            name: `${name}-cover`,
            type: 'collection-cover'
          }
        }
      );
      coverImage = upload.url;

      // Cleanup uploaded file
      fs.unlinkSync(req.files.coverImage[0].path);
    }

    // Create collection in database (storing metadata only)
    const collection = await Collection.create({
      name,
      symbol,
      description,
      creator: userId,
      tokenId,
      supplyKey: treasuryAccountId || req.user.hederaAccount.accountId, // User's wallet is the supply key
      royaltyPercentage: royaltyPercentage || 10,
      maxSupply: maxSupply || 0,
      coverImage,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : []
    });

    // Update user's creator stats
    await User.findByIdAndUpdate(userId, {
      $inc: { 'creatorProfile.totalComics': 1 }
    });

    logger.info(`Collection metadata saved: ${collection._id} (tokenId: ${tokenId}) by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Collection metadata saved successfully',
      data: {
        collection,
        hedera: {
          tokenId,
          transactionId,
          explorerUrl: `https://hashscan.io/testnet/token/${tokenId}`
        }
      }
    });
  } catch (error) {
    // Cleanup files on error
    if (req.files) {
      cleanupFiles(req.files);
    }
    throw error;
  }
});

/**
 * @desc    Get all collections
 * @route   GET /api/v1/comics/collections
 * @access  Public
 */
export const getCollections = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    creator,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  const query = { isActive: true };

  if (category) query.category = category;
  if (creator) query.creator = creator;

  const sortOptions = {};
  sortOptions[sortBy] = order === 'desc' ? -1 : 1;

  const collections = await Collection.find(query)
    .populate('creator', 'username profile.displayName profile.avatar')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort(sortOptions);

  const count = await Collection.countDocuments(query);

  res.json({
    success: true,
    data: {
      collections,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    }
  });
});

/**
 * @desc    Get collection by ID
 * @route   GET /api/v1/comics/collections/:id
 * @access  Public
 */
export const getCollectionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const collection = await Collection.findById(id)
    .populate('creator', 'username email profile creatorProfile');

  if (!collection) {
    return res.status(404).json({
      success: false,
      message: 'Collection not found'
    });
  }

  // Get comics in this collection
  const comics = await Comic.find({
    collection: id,
    status: 'published'
  }).limit(12);

  res.json({
    success: true,
    data: {
      collection,
      comics,
      comicsCount: await Comic.countDocuments({ collection: id })
    }
  });
});

/**
 * @desc    Update collection
 * @route   PUT /api/v1/comics/collections/:id
 * @access  Private (Creator Only)
 */
export const updateCollection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const collection = await Collection.findOne({
    _id: id,
    creator: userId
  });

  if (!collection) {
    return res.status(404).json({
      success: false,
      message: 'Collection not found or unauthorized'
    });
  }

  const allowedUpdates = ['description', 'category', 'tags'];
  const updates = {};

  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  if (updates.tags && typeof updates.tags === 'string') {
    updates.tags = updates.tags.split(',').map(t => t.trim());
  }

  const updatedCollection = await Collection.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  logger.info(`Collection updated: ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Collection updated successfully',
    data: { collection: updatedCollection }
  });
});

/**
 * @desc    Delete collection (only if no comics)
 * @route   DELETE /api/v1/comics/collections/:id
 * @access  Private (Creator Only)
 */
export const deleteCollection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const collection = await Collection.findOne({
    _id: id,
    creator: userId
  });

  if (!collection) {
    return res.status(404).json({
      success: false,
      message: 'Collection not found or unauthorized'
    });
  }

  // Check if collection has comics
  const comicsCount = await Comic.countDocuments({ collection: id });

  if (comicsCount > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete collection with existing comics'
    });
  }

  await collection.deleteOne();

  logger.info(`Collection deleted: ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Collection deleted successfully'
  });
});

/**
 * @desc    Create comic (upload to IPFS, prepare for minting)
 * @route   POST /api/v1/comics
 * @access  Private (Creator + Wallet)
 */
export const createComic = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    collectionId,
    issueNumber,
    series,
    genre,
    artists,
    writers,
    colorists,
    letterers,
    price,
    supply,
    edition,
    rarity
  } = req.body;

  const userId = req.user.id;
  const comicId = uuidv4();

  try {
    // Verify collection ownership
    const collection = await Collection.findOne({
      _id: collectionId,
      creator: userId
    });

    if (!collection) {
      return res.status(403).json({
        success: false,
        message: 'Collection not found or unauthorized'
      });
    }

    // Check files
    if (!req.files || !req.files.pages || !req.files.cover) {
      return res.status(400).json({
        success: false,
        message: 'Please upload cover image and comic pages'
      });
    }

    const pages = req.files.pages || [];
    const coverImage = req.files.cover[0];

    // Upload comic to IPFS
    logger.info(`Uploading comic ${comicId} to IPFS...`);

    const ipfsUpload = await ipfsService.uploadComicPackage({
      pages: pages.map(f => ({ path: f.path })),
      coverImage: coverImage.path,
      metadata: {
        name: title,
        description,
        comicId,
        series,
        issueNumber
      },
      comicId
    });

    // Cleanup uploaded files AFTER IPFS upload completes
    pages.forEach(f => {
      try {
        if (fs.existsSync(f.path)) {
          fs.unlinkSync(f.path);
          logger.info(`Cleaned up file: ${f.path}`);
        }
      } catch (err) {
        logger.error(`Failed to cleanup file ${f.path}:`, err);
      }
    });
    try {
      if (fs.existsSync(coverImage.path)) {
        fs.unlinkSync(coverImage.path);
        logger.info(`Cleaned up file: ${coverImage.path}`);
      }
    } catch (err) {
      logger.error(`Failed to cleanup cover file:`, err);
    }

    // Create comic in database
    const comic = await Comic.create({
      title,
      description,
      collection: collectionId,
      creator: userId,
      issueNumber: issueNumber ? parseInt(issueNumber) : undefined,
      series,
      genre: genre ? genre.split(',').map(g => g.trim()) : [],
      artists: artists ? artists.split(',').map(a => a.trim()) : [],
      writers: writers ? writers.split(',').map(w => w.trim()) : [],
      colorists: colorists ? colorists.split(',').map(c => c.trim()) : [],
      letterers: letterers ? letterers.split(',').map(l => l.trim()) : [],
      pageCount: pages.length,
      edition: edition || 'standard',
      rarity: rarity || 'common',
      supply: supply ? parseInt(supply) : 1,
      price: parseFloat(price),
      content: {
        metadataUri: ipfsUpload.metadataUri,
        metadataHash: ipfsUpload.metadataUri.replace('ipfs://', ''),
        coverImage: ipfsUpload.cover.url,
        pages: ipfsUpload.pages.pages.map(p => ({
          pageNumber: p.pageNumber,
          original: p.original.url,
          web: p.web.url,
          thumbnail: p.thumbnail.url
        })),
        downloads: {
          cbz: ipfsUpload.cbz.url
        }
      },
      status: 'pending'
    });

    logger.info(`Comic created: ${comic._id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Comic created successfully. Ready to mint!',
      data: {
        comic,
        ipfs: {
          metadataUri: ipfsUpload.metadataUri,
          coverUrl: ipfsUpload.cover.url,
          cbzUrl: ipfsUpload.cbz.url
        }
      }
    });
  } catch (error) {
    // Cleanup files on error
    if (req.files) {
      cleanupFiles(req.files);
    }
    throw error;
  }
});

/**
 * @desc    Save mint results after user mints on frontend
 * @route   POST /api/v1/comics/:id/mint
 * @access  Private (Creator + Wallet)
 */
export const mintComic = asyncHandler(async (req, res) => {
  const { id: comicId } = req.params;
  const { serialNumbers, transactionId } = req.body;
  const userId = req.user.id;

  // Validate required fields
  if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Serial numbers are required'
    });
  }

  if (!transactionId) {
    return res.status(400).json({
      success: false,
      message: 'Transaction ID is required'
    });
  }

  const comic = await Comic.findOne({
    _id: comicId,
    creator: userId
  }).populate('collection');

  if (!comic) {
    return res.status(404).json({
      success: false,
      message: 'Comic not found or unauthorized'
    });
  }

  if (comic.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Comic has already been minted or is not ready'
    });
  }

  const mintQuantity = serialNumbers.length;

  // Check if minting would exceed supply
  if (comic.minted + mintQuantity > comic.supply) {
    return res.status(400).json({
      success: false,
      message: `Cannot mint ${mintQuantity}. Only ${comic.supply - comic.minted} remaining`
    });
  }

  logger.info(`Saving mint results for comic ${comicId}: ${mintQuantity} NFTs`);

  // Update comic with minted NFTs
  const nfts = serialNumbers.map(serial => ({
    serialNumber: parseInt(serial),
    owner: userId,
    ownerAccountId: req.user.hederaAccount.accountId,
    mintedAt: new Date(),
    transactionId
  }));

  comic.nfts.push(...nfts);
  comic.minted += mintQuantity;

  if (comic.minted > 0 && comic.status === 'pending') {
    comic.status = 'published';
    comic.publishedAt = new Date();
  }

  await comic.save();

  // Update collection stats
  await Collection.findByIdAndUpdate(comic.collection._id, {
    $inc: { totalMinted: mintQuantity }
  });

  logger.info(`Saved ${mintQuantity} minted NFTs for comic ${comicId}`);

  res.json({
    success: true,
    message: `Successfully minted ${mintQuantity} NFT${mintQuantity > 1 ? 's' : ''}`,
    data: {
      comic,
      hedera: {
        serialNumbers,
        transactionId,
        explorerUrl: `https://hashscan.io/testnet/transaction/${transactionId}`
      }
    }
  });
});

/**
 * @desc    Get all comics
 * @route   GET /api/v1/comics
 * @access  Public
 */
export const getComics = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    genre,
    status,
    creator,
    search,
    minPrice,
    maxPrice,
    edition,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  const query = {};

  if (category) query.category = category;
  if (genre) query.genre = { $in: genre.split(',') };
  if (status) query.status = status;
  else query.status = 'published'; // Default to published only
  if (creator) query.creator = creator;
  if (edition) query.edition = edition;
  
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { series: { $regex: search, $options: 'i' } }
    ];
  }

  const sortOptions = {};
  sortOptions[sortBy] = order === 'desc' ? -1 : 1;

  const comics = await Comic.find(query)
    .populate('creator', 'username profile')
    .populate('collection', 'name symbol')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort(sortOptions);

  const count = await Comic.countDocuments(query);

  res.json({
    success: true,
    data: {
      comics,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    }
  });
});

/**
 * @desc    Get comic by ID
 * @route   GET /api/v1/comics/:id
 * @access  Public
 */
export const getComicById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comic = await Comic.findById(id)
    .populate('creator', 'username email profile creatorProfile')
    .populate('collection', 'name symbol tokenId royaltyPercentage')
    .populate('nfts.owner', '_id username');

  if (!comic) {
    return res.status(404).json({
      success: false,
      message: 'Comic not found'
    });
  }

  // Increment view count
  comic.stats.views += 1;
  await comic.save();

  res.json({
    success: true,
    data: { comic }
  });
});

/**
 * @desc    Update comic
 * @route   PUT /api/v1/comics/:id
 * @access  Private (Creator Only - before minting)
 */
export const updateComic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const comic = await Comic.findOne({
    _id: id,
    creator: userId
  });

  if (!comic) {
    return res.status(404).json({
      success: false,
      message: 'Comic not found or unauthorized'
    });
  }

  if (comic.status !== 'draft' && comic.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update published comic'
    });
  }

  const allowedUpdates = ['title', 'description', 'price', 'genre', 'artists', 'writers'];
  const updates = {};

  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Handle arrays
  if (updates.genre && typeof updates.genre === 'string') {
    updates.genre = updates.genre.split(',').map(g => g.trim());
  }
  if (updates.artists && typeof updates.artists === 'string') {
    updates.artists = updates.artists.split(',').map(a => a.trim());
  }
  if (updates.writers && typeof updates.writers === 'string') {
    updates.writers = updates.writers.split(',').map(w => w.trim());
  }

  const updatedComic = await Comic.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  logger.info(`Comic updated: ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Comic updated successfully',
    data: { comic: updatedComic }
  });
});

/**
 * @desc    Delete comic (only if not minted)
 * @route   DELETE /api/v1/comics/:id
 * @access  Private (Creator Only)
 */
export const deleteComic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const comic = await Comic.findOne({
    _id: id,
    creator: userId
  });

  if (!comic) {
    return res.status(404).json({
      success: false,
      message: 'Comic not found or unauthorized'
    });
  }

  if (comic.minted > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete comic with minted NFTs'
    });
  }

  await comic.deleteOne();

  logger.info(`Comic deleted: ${id} by user ${userId}`);

  res.json({
    success: true,
    message: 'Comic deleted successfully'
  });
});

/**
 * @desc    Get creator's own comics
 * @route   GET /api/v1/comics/creator/my-comics
 * @access  Private (Creator)
 */
export const getCreatorComics = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, status } = req.query;

  const query = { creator: userId };
  if (status) query.status = status;

  const comics = await Comic.find(query)
    .populate('creator', '_id username email')
    .populate('collection', 'name symbol')
    .populate('nfts.owner', '_id username')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Comic.countDocuments(query);

  res.json({
    success: true,
    data: {
      comics,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    }
  });
});

/**
 * @desc    Get user's collected comics (NFTs they own)
 * @route   GET /api/v1/comics/user/collection
 * @access  Private
 */
export const getUserComics = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;

  // Find all comics where user owns at least one NFT
  const comics = await Comic.find({
    'nfts.owner': userId
  })
    .populate('creator', 'username profile')
    .populate('collection', 'name symbol')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ 'nfts.mintedAt': -1 });

  // Filter to show only owned NFTs
  const comicsWithOwnedNFTs = comics.map(comic => {
    const ownedNFTs = comic.nfts.filter(nft => nft.owner.toString() === userId);
    return {
      ...comic.toObject(),
      ownedNFTs
    };
  });

  const count = await Comic.countDocuments({ 'nfts.owner': userId });

  res.json({
    success: true,
    data: {
      comics: comicsWithOwnedNFTs,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    }
  });
});

export default {
  createCollection,
  getCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
  createComic,
  mintComic,
  getComics,
  getComicById,
  updateComic,
  deleteComic,
  getCreatorComics,
  getUserComics
};