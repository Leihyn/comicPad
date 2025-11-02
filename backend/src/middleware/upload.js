import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import logger from '../utils/logger.js';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Configure storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

/**
 * File filter for images
 */
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
  }
};

/**
 * File filter for documents
 */
const documentFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /application\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document)/.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed'), false);
  }
};

/**
 * Base upload configuration
 */
const createUpload = (filter, maxSize = 52428800) => { // 50MB default
  return multer({
    storage,
    limits: {
      fileSize: maxSize,
      files: 50 // Maximum 50 files
    },
    fileFilter: filter
  });
};

/**
 * Upload middleware for images
 */
export const uploadImage = createUpload(imageFilter);

/**
 * Upload middleware for comic pages
 */
export const uploadComicPages = uploadImage.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pages', maxCount: 100 }
]);

/**
 * Upload middleware for collection cover
 */
export const uploadCollectionCover = uploadImage.single('coverImage');

/**
 * Upload middleware for profile images
 */
export const uploadProfileImages = uploadImage.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]);

/**
 * Upload middleware for documents
 */
export const uploadDocument = createUpload(documentFilter);

/**
 * Cleanup uploaded files on error
 */
export const cleanupFiles = (files) => {
  if (!files) return;

  const fileList = [];

  if (Array.isArray(files)) {
    fileList.push(...files);
  } else if (typeof files === 'object') {
    Object.values(files).forEach(value => {
      if (Array.isArray(value)) {
        fileList.push(...value);
      } else {
        fileList.push(value);
      }
    });
  }

  fileList.forEach(file => {
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        logger.info(`Cleaned up file: ${file.path}`);
      }
    } catch (error) {
      logger.error(`Failed to cleanup file ${file.path}:`, error);
    }
  });
};

/**
 * Middleware to cleanup files on error
 */
export const autoCleanup = (err, req, res, next) => {
  if (err && req.files) {
    cleanupFiles(req.files);
  }
  next(err);
};

export default {
  uploadImage,
  uploadComicPages,
  uploadCollectionCover,
  uploadProfileImages,
  uploadDocument,
  cleanupFiles,
  autoCleanup
};