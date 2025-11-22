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
  getMyCollection,
  deleteComic,
  deleteEpisode,
  mintEpisodeBackend
} from '../controllers/comicControllerEnhanced.js';
import { createCollectionOnHedera } from '../controllers/comicController.js';
import { protect } from '../middleware/auth.js';
import { demoProtect } from '../middleware/demoAuth.js'; // Demo mode

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
router.post('/', demoProtect, upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pages', maxCount: 100 }
]), createComic); // DEMO MODE
router.post('/collections', protect, upload.single('cover'), createComic); // Alias for frontend compatibility (collection creation only)
router.post('/collections/create-on-hedera', demoProtect, upload.single('cover'), createCollectionOnHedera); // Backend collection creation (bypasses WalletConnect) - DEMO MODE

// Comic list routes (must be before /:comicId)
router.get('/', getComics);
router.get('/collections', getComics); // Alias - same as getting all comics
router.get('/my-comics', demoProtect, getMyComics); // DEMO MODE
router.get('/creator/my-comics', demoProtect, getMyComics); // Alias for frontend - DEMO MODE
router.get('/my-collection', demoProtect, getMyCollection); // DEMO MODE
router.get('/user/collection', demoProtect, getMyCollection); // Alias for frontend - DEMO MODE

// Episode-specific routes (must be before /:comicId)
router.post('/episodes/:episodeId/publish', demoProtect, publishEpisode); // DEMO MODE
router.post('/episodes/:episodeId/mint', demoProtect, mintEpisodeNFT); // DEMO MODE
router.get('/episodes/:episodeId', getEpisode);
router.get('/episodes/:episodeId/read', demoProtect, readEpisode); // DEMO MODE
router.put('/episodes/:episodeId/progress', demoProtect, updateReadingProgress); // DEMO MODE

// Episode creation (must be before /:comicId)
router.post('/:comicId/episodes', demoProtect, upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pages', maxCount: 100 }
]), createEpisode); // DEMO MODE

// Comic detail route (MUST be last - catches everything else)
router.get('/:comicId', getComic);


// Backend minting route (must be before /:comicId)
router.post('/episodes/:episodeId/mint-backend', demoProtect, mintEpisodeBackend); // DEMO MODE - bypasses wallet

// Delete routes (must be before /:comicId)
router.delete('/episodes/:episodeId', demoProtect, deleteEpisode); // DEMO MODE
router.delete('/:comicId', demoProtect, deleteComic); // DEMO MODE

export default router;
