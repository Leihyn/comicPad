// backend/src/models/index.js
// Central export file for all database models

import User from './User.js';
import Comic from './Comic.js';
import Episode from './Episode.js';
import Listing from './Listing.js';
import ReadHistory from './ReadHistory.js';
import MarketplaceTransaction from './MarketplaceTransaction.js';

export {
  User,
  Comic,
  Episode,
  Listing,
  ReadHistory,
  MarketplaceTransaction
};

export default {
  User,
  Comic,
  Episode,
  Listing,
  ReadHistory,
  MarketplaceTransaction
};