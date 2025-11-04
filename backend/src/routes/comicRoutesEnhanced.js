// backend/src/routes/comicRoutesEnhanced.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import {
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
} from '../controllers/comicControllerEnhanced.js';
import { createCollectionOnHedera } from '../controllers/comicController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// IMPORTANT: Specific routes MUST come before wildcard routes like /:comicId

// Comic creation routes
// When collectionId is provided, this creates an episode (comic issue) with cover + pages
// When no collectionId, this creates a collection with just cover
router.post('/', protect, upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pages', maxCount: 100 }
]), createComic);
router.post('/collections', protect, upload.single('cover'), createComic); // Alias for frontend compatibility (collection creation only)
router.post('/collections/create-on-hedera', protect, upload.single('cover'), createCollectionOnHedera); // Backend collection creation (bypasses WalletConnect)

// Comic list routes (must be before /:comicId)
router.get('/', getComics);
router.get('/collections', getComics); // Alias - same as getting all comics
router.get('/my-comics', protect, getMyComics);
router.get('/creator/my-comics', protect, getMyComics); // Alias for frontend
router.get('/my-collection', protect, getMyCollection);
router.get('/user/collection', protect, getMyCollection); // Alias for frontend

// Episode-specific routes (must be before /:comicId)
router.post('/episodes/:episodeId/publish', protect, publishEpisode);
router.post('/episodes/:episodeId/mint', protect, mintEpisodeNFT);
router.get('/episodes/:episodeId', getEpisode);
router.get('/episodes/:episodeId/read', protect, readEpisode);
router.put('/episodes/:episodeId/progress', protect, updateReadingProgress);

// Episode creation (must be before /:comicId)
router.post('/:comicId/episodes', protect, upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pages', maxCount: 100 }
]), createEpisode);

// Comic detail route (MUST be last - catches everything else)
router.get('/:comicId', getComic);

export default router;
