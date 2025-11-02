import express from 'express';
import {
  getComicContent,
  saveProgress,
  toggleBookmark,
  getProgress,
  downloadComic
} from '../controllers/readerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get comic content (requires ownership)
router.get('/comic/:comicId', protect, getComicContent);
router.get('/comics/:comicId', protect, getComicContent); // Alias for backward compatibility

// Save reading progress
router.post('/progress', protect, saveProgress);

// Toggle bookmark
router.post('/bookmark', protect, toggleBookmark);

// Get reading progress
router.get('/progress/:comicId', protect, getProgress);

// Download comic
router.get('/download/:comicId', protect, downloadComic);

export default router;
