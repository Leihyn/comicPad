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
  getMarketplaceStats,
  getMarketplaceHistory,
  getTransaction,
  getTransactionStats
} from '../controllers/marketplaceControllerEnhanced.js';
// Import the working createListing from old controller for backward compatibility
import { createListing as createListingOld } from '../controllers/marketplaceController.js';
import { protect } from '../middleware/auth.js';
import { demoProtect } from '../middleware/demoAuth.js'; // Demo mode

const router = express.Router();

// Public routes
router.get('/listings', getListings);
router.get('/listings/:listingId', getListing);
router.get('/stats', getMarketplaceStats);
router.get('/stats/transactions', getTransactionStats);
router.get('/operator', (req, res) => {
  res.json({
    success: true,
    data: {
      operatorAccountId: process.env.HEDERA_OPERATOR_ID
    }
  });
});

// Protected routes - DEMO MODE
router.post('/listings', demoProtect, createListing); // DEMO MODE
router.post('/list', demoProtect, createListingOld); // Alias route for frontend compatibility - DEMO MODE
router.post('/auctions', demoProtect, createAuction); // DEMO MODE
router.post('/auctions/:listingId/bid', demoProtect, placeBid); // DEMO MODE
router.post('/listings/:listingId/buy', demoProtect, buyNFT); // DEMO MODE
router.post('/auctions/:listingId/complete', demoProtect, completeAuction); // DEMO MODE
router.delete('/listings/:listingId', demoProtect, cancelListing); // DEMO MODE
router.get('/users/me/listings', demoProtect, getMyListings); // DEMO MODE

// Transaction history routes - DEMO MODE
router.get('/history', demoProtect, getMarketplaceHistory); // DEMO MODE
router.get('/history/:transactionId', demoProtect, getTransaction); // DEMO MODE

export default router;
