// backend/src/routes/marketplaceRoutesEnhanced.js
import express from 'express';
import {
  createListing,
  createAuction,
  placeBid,
  buyNFT,
  completeAuction,
  cancelListing,
  getListings,
  getListing,
  getMyListings,
  getMarketplaceStats
} from '../controllers/marketplaceControllerEnhanced.js';
// Import the working createListing from old controller for backward compatibility
import { createListing as createListingOld } from '../controllers/marketplaceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/listings', getListings);
router.get('/listings/:listingId', getListing);
router.get('/stats', getMarketplaceStats);
router.get('/operator', (req, res) => {
  res.json({
    success: true,
    data: {
      operatorAccountId: process.env.HEDERA_OPERATOR_ID
    }
  });
});

// Protected routes
router.post('/listings', protect, createListing);
router.post('/list', protect, createListingOld); // Alias route for frontend compatibility
router.post('/auctions', protect, createAuction);
router.post('/auctions/:listingId/bid', protect, placeBid);
router.post('/listings/:listingId/buy', protect, buyNFT);
router.post('/auctions/:listingId/complete', protect, completeAuction);
router.delete('/listings/:listingId', protect, cancelListing);
router.get('/users/me/listings', protect, getMyListings);

export default router;
