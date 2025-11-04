// backend/src/routes/comicRoutes.js
import express from 'express';
import { body, query, param } from 'express-validator';
import {
  createCollectionOnHedera,
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
} from '../controllers/comicController.js';
import { protect, requireCreator, requireWallet } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { uploadComicPages, uploadCollectionCover } from '../middleware/upload.js';
import { mintLimiter, uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ========== COLLECTION ROUTES ==========

/**
 * @route   POST /api/v1/comics/collections/create-on-hedera
 * @desc    Create NFT collection on Hedera (backend creates it)
 * @access  Private (Creator)
 */
router.post(
  '/collections/create-on-hedera',
  protect,
  requireCreator,
  uploadLimiter,
  uploadCollectionCover,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Collection name is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Name must be between 3 and 50 characters'),
    body('symbol')
      .trim()
      .notEmpty()
      .withMessage('Symbol is required')
      .isLength({ min: 2, max: 10 })
      .withMessage('Symbol must be between 2 and 10 characters')
      .matches(/^[A-Z0-9]+$/)
      .withMessage('Symbol must be uppercase letters and numbers only'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('royaltyPercentage')
      .optional()
      .isFloat({ min: 5, max: 25 })
      .withMessage('Royalty must be between 5% and 25%'),
    body('maxSupply')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max supply must be a positive integer'),
    body('category')
      .optional()
      .isIn(['superhero', 'manga', 'horror', 'sci-fi', 'fantasy', 'indie', 'webcomic', 'other'])
      .withMessage('Invalid category')
  ],
  validate,
  createCollectionOnHedera
);

/**
 * @route   POST /api/v1/comics/collections
 * @desc    Create new NFT collection
 * @access  Private (Creator + Wallet Required)
 */
router.post(
  '/collections',
  protect,
  requireCreator,
  requireWallet,
  uploadLimiter,
  uploadCollectionCover,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Collection name is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Name must be between 3 and 50 characters'),
    body('symbol')
      .trim()
      .notEmpty()
      .withMessage('Symbol is required')
      .isLength({ min: 2, max: 10 })
      .withMessage('Symbol must be between 2 and 10 characters')
      .matches(/^[A-Z0-9]+$/)
      .withMessage('Symbol must be uppercase letters and numbers only'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('royaltyPercentage')
      .optional()
      .isFloat({ min: 5, max: 25 })
      .withMessage('Royalty must be between 5% and 25%'),
    body('maxSupply')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max supply must be a positive integer'),
    body('category')
      .optional()
      .isIn(['superhero', 'manga', 'horror', 'sci-fi', 'fantasy', 'indie', 'webcomic', 'other'])
      .withMessage('Invalid category'),
    body('tokenId')
      .trim()
      .notEmpty()
      .withMessage('Token ID is required (collection must be created on frontend first)')
      .matches(/^0\.0\.\d+$/)
      .withMessage('Token ID must be in format 0.0.xxxxx'),
    body('transactionId')
      .optional()
      .trim()
      .isString()
      .withMessage('Transaction ID must be a string'),
    body('treasuryAccountId')
      .optional()
      .trim()
      .matches(/^0\.0\.\d+$/)
      .withMessage('Treasury account ID must be in format 0.0.xxxxx')
  ],
  validate,
  createCollection
);

/**
 * @route   GET /api/v1/comics/collections
 * @desc    Get all collections
 * @access  Public
 */
router.get(
  '/collections',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
    query('category').optional().isString(),
    query('creator').optional().isMongoId().withMessage('Invalid creator ID')
  ],
  validate,
  getCollections
);

/**
 * @route   GET /api/v1/comics/collections/:id
 * @desc    Get collection by ID
 * @access  Public
 */
router.get(
  '/collections/:id',
  [param('id').isMongoId().withMessage('Invalid collection ID')],
  validate,
  getCollectionById
);

/**
 * @route   PUT /api/v1/comics/collections/:id
 * @desc    Update collection
 * @access  Private (Creator Only)
 */
router.put(
  '/collections/:id',
  protect,
  requireCreator,
  [
    param('id').isMongoId().withMessage('Invalid collection ID'),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('category').optional().isIn(['superhero', 'manga', 'horror', 'sci-fi', 'fantasy', 'indie', 'webcomic', 'other'])
  ],
  validate,
  updateCollection
);

/**
 * @route   DELETE /api/v1/comics/collections/:id
 * @desc    Delete collection (only if no comics)
 * @access  Private (Creator Only)
 */
router.delete(
  '/collections/:id',
  protect,
  requireCreator,
  [param('id').isMongoId().withMessage('Invalid collection ID')],
  validate,
  deleteCollection
);

// ========== COMIC ROUTES ==========

/**
 * @route   POST /api/v1/comics
 * @desc    Create new comic (upload to IPFS)
 * @access  Private (Creator + Wallet Required)
 */
router.post(
  '/',
  protect,
  requireCreator,
  requireWallet,
  uploadLimiter,
  uploadComicPages,
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ min: 3, max: 200 })
      .withMessage('Title must be between 3 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('collectionId')
      .isMongoId()
      .withMessage('Valid collection ID is required'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('supply')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Supply must be between 1 and 10000'),
    body('edition')
      .optional()
      .isIn(['standard', 'limited', 'rare', 'ultra-rare', 'one-of-one'])
      .withMessage('Invalid edition type'),
    body('genre')
      .optional()
      .isString()
      .withMessage('Genre must be a comma-separated string')
  ],
  validate,
  createComic
);

/**
 * @route   POST /api/v1/comics/:id/mint
 * @desc    Mint comic NFTs on Hedera
 * @access  Private (Creator + Wallet Required)
 */
router.post(
  '/:id/mint',
  protect,
  requireCreator,
  requireWallet,
  mintLimiter,
  [
    param('id').isMongoId().withMessage('Invalid comic ID'),
    body('quantity')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Quantity must be between 1 and 1000')
  ],
  validate,
  mintComic
);

/**
 * @route   GET /api/v1/comics
 * @desc    Get all comics (with filters)
 * @access  Public
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('genre').optional().isString(),
    query('status').optional().isIn(['draft', 'pending', 'published', 'sold-out', 'archived']),
    query('creator').optional().isMongoId(),
    query('search').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('edition').optional().isIn(['standard', 'limited', 'rare', 'ultra-rare', 'one-of-one']),
    query('sortBy').optional().isIn(['createdAt', 'price', 'views', 'favorites'])
  ],
  validate,
  getComics
);

/**
 * @route   GET /api/v1/comics/:id
 * @desc    Get comic by ID
 * @access  Public
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid comic ID')],
  validate,
  getComicById
);

/**
 * @route   PUT /api/v1/comics/:id
 * @desc    Update comic
 * @access  Private (Creator Only - before minting)
 */
router.put(
  '/:id',
  protect,
  requireCreator,
  [
    param('id').isMongoId().withMessage('Invalid comic ID'),
    body('title').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('price').optional().isFloat({ min: 0 })
  ],
  validate,
  updateComic
);

/**
 * @route   DELETE /api/v1/comics/:id
 * @desc    Delete comic (only if not minted)
 * @access  Private (Creator Only)
 */
router.delete(
  '/:id',
  protect,
  requireCreator,
  [param('id').isMongoId().withMessage('Invalid comic ID')],
  validate,
  deleteComic
);

/**
 * @route   POST /api/v1/comics/:id/gift
 * @desc    Gift NFT to another user
 * @access  Private (Wallet Required)
 */
router.post(
  '/:id/gift',
  protect,
  requireWallet,
  [
    param('id').isMongoId().withMessage('Invalid comic ID'),
    body('recipient')
      .trim()
      .notEmpty()
      .withMessage('Recipient is required (username or Hedera Account ID)')
  ],
  validate,
  async (req, res) => {
    // Will be implemented in controller
  }
);

/**
 * @route   GET /api/v1/comics/creator/my-comics
 * @desc    Get creator's own comics
 * @access  Private (Creator)
 */
router.get(
  '/creator/my-comics',
  protect,
  requireCreator,
  getCreatorComics
);

/**
 * @route   GET /api/v1/comics/user/collection
 * @desc    Get user's collected comics (NFTs they own)
 * @access  Private
 */
router.get(
  '/user/collection',
  protect,
  requireWallet,
  getUserComics
);

// ========== FAVORITE ROUTES ==========

/**
 * @route   POST /api/v1/comics/:id/favorite
 * @desc    Add comic to favorites
 * @access  Private
 */
router.post(
  '/:id/favorite',
  protect,
  [param('id').isMongoId().withMessage('Invalid comic ID')],
  validate,
  async (req, res) => {
    // Implementation in controller
  }
);

/**
 * @route   DELETE /api/v1/comics/:id/favorite
 * @desc    Remove comic from favorites
 * @access  Private
 */
router.delete(
  '/:id/favorite',
  protect,
  [param('id').isMongoId().withMessage('Invalid comic ID')],
  validate,
  async (req, res) => {
    // Implementation in controller
  }
);

export default router;

