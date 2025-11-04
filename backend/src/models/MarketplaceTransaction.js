// backend/src/models/MarketplaceTransaction.js
import mongoose from 'mongoose';

const marketplaceTransactionSchema = new mongoose.Schema({
  // Transaction Type
  type: {
    type: String,
    enum: ['purchase', 'listing', 'delisting', 'bid', 'auction_complete'],
    required: true
  },

  // Transaction Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    required: true,
    default: 'pending'
  },

  // Parties Involved
  buyer: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    accountId: { type: String }
  },

  seller: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    accountId: { type: String, required: true }
  },

  // NFT Details
  nft: {
    tokenId: { type: String, required: true },
    serialNumber: { type: Number, required: true },
    comicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comic' },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' }
  },

  // Listing Reference
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing'
  },

  // Financial Details
  price: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'HBAR' }
  },

  fees: {
    platformFee: { type: Number, default: 0 },
    royaltyFee: { type: Number, default: 0 },
    totalFees: { type: Number, default: 0 }
  },

  // Hedera Transaction Details
  hederaTransaction: {
    transactionId: { type: String },
    transactionHash: { type: String },
    explorerUrl: { type: String },
    consensusTimestamp: { type: String }
  },

  // Error Information (for failed transactions)
  error: {
    code: { type: String },
    message: { type: String },
    details: { type: mongoose.Schema.Types.Mixed }
  },

  // Additional Metadata
  metadata: {
    userAgent: { type: String },
    ipAddress: { type: String },
    attemptNumber: { type: Number, default: 1 }
  },

  // Timestamps
  initiatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  failedAt: { type: Date }
}, {
  timestamps: true
});

// Indexes for efficient queries
marketplaceTransactionSchema.index({ 'buyer.userId': 1, createdAt: -1 });
marketplaceTransactionSchema.index({ 'seller.userId': 1, createdAt: -1 });
marketplaceTransactionSchema.index({ 'buyer.accountId': 1, createdAt: -1 });
marketplaceTransactionSchema.index({ 'seller.accountId': 1, createdAt: -1 });
marketplaceTransactionSchema.index({ listingId: 1 });
marketplaceTransactionSchema.index({ status: 1, createdAt: -1 });
marketplaceTransactionSchema.index({ type: 1, status: 1 });
marketplaceTransactionSchema.index({ 'hederaTransaction.transactionId': 1 });

// Virtual for transaction duration
marketplaceTransactionSchema.virtual('duration').get(function() {
  if (this.completedAt) {
    return this.completedAt - this.initiatedAt;
  } else if (this.failedAt) {
    return this.failedAt - this.initiatedAt;
  }
  return null;
});

// Method to mark transaction as completed
marketplaceTransactionSchema.methods.markCompleted = function(hederaDetails) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (hederaDetails) {
    this.hederaTransaction = {
      ...this.hederaTransaction,
      ...hederaDetails
    };
  }
  return this.save();
};

// Method to mark transaction as failed
marketplaceTransactionSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.error = {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'Transaction failed',
    details: error.details || error
  };
  return this.save();
};

// Static method to get user transaction history
marketplaceTransactionSchema.statics.getUserHistory = async function(userId, options = {}) {
  const {
    type,
    status,
    limit = 50,
    skip = 0
  } = options;

  const query = {
    $or: [
      { 'buyer.userId': userId },
      { 'seller.userId': userId }
    ]
  };

  if (type) query.type = type;
  if (status) query.status = status;

  return this.find(query)
    .populate('buyer.userId', 'username email')
    .populate('seller.userId', 'username email')
    .populate('nft.comicId', 'title coverImage')
    .populate('nft.episodeId', 'episodeNumber title')
    .populate('listingId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get listing transaction history
marketplaceTransactionSchema.statics.getListingHistory = async function(listingId) {
  return this.find({ listingId })
    .populate('buyer.userId', 'username email')
    .populate('seller.userId', 'username email')
    .sort({ createdAt: -1 });
};

// Static method to get marketplace statistics
marketplaceTransactionSchema.statics.getMarketplaceStats = async function(timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: 'completed',
        type: 'purchase'
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalVolume: { $sum: '$price.amount' },
        totalFees: { $sum: '$fees.totalFees' },
        avgPrice: { $avg: '$price.amount' },
        avgDuration: { $avg: { $subtract: ['$completedAt', '$initiatedAt'] } }
      }
    }
  ]);

  const failedTransactions = await this.countDocuments({
    createdAt: { $gte: startDate },
    status: 'failed',
    type: 'purchase'
  });

  return {
    ...stats[0],
    failedTransactions,
    successRate: stats[0] ? (stats[0].totalSales / (stats[0].totalSales + failedTransactions) * 100) : 0
  };
};

export default mongoose.model('MarketplaceTransaction', marketplaceTransactionSchema);
