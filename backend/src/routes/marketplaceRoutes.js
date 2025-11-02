import express from 'express';
import { body } from 'express-validator';
import {
  createListing,
  buyNFT,
  placeBid,
  completeAuction,
  cancelListing,
  getListings,
  getListingById,
  makeOffer,
  respondToOffer
} from '../controllers/marketplaceController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';

const router = express.Router();

// Listings management
router.get('/listings', getListings);
router.get('/listings/:listingId', getListingById);
router.post('/listings', protect, createListing);
router.post('/listings/:listingId/buy', protect, buyNFT);
router.post('/listings/:listingId/bid', protect, placeBid);
router.post('/listings/:listingId/complete', protect, completeAuction);
router.delete('/listings/:listingId', protect, cancelListing);

// Simplified endpoints for frontend modal
router.post('/list', protect, createListing); // Alias for easier frontend calls
router.post('/auction', protect, createListing); // Same endpoint, different data

// Offers
router.post('/offers', protect, makeOffer);
router.put('/offers/:id', protect, respondToOffer);

export default router;