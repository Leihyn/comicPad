// backend/src/models/Listing.js
import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  // NFT Information
  tokenId: {
    type: String,
    required: [true, 'Token ID is required']
  },
  serialNumber: {
    type: Number,
    required: [true, 'Serial number is required']
  },

  // Relationships
  comic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comic',
    required: true
  },
  episode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode',
    required: true
  },

  // Seller Information
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerAccountId: {
    type: String,
    required: [true, 'Seller account ID is required']
  },

  // Listing Type
  listingType: {
    type: String,
    enum: ['fixed-price', 'auction', 'offer'],
    default: 'fixed-price'
  },

  // Fixed Price Details
  price: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      enum: ['HBAR', 'USDT'],
      default: 'HBAR'
    }
  },

  // Auction Details (if listingType is 'auction')
  auction: {
    startingPrice: {
      type: Number,
      min: 0
    },
    reservePrice: {
      type: Number,
      min: 0
    },
    currentBid: {
      type: Number,
      default: 0
    },
    minimumBidIncrement: {
      type: Number,
      default: 1
    },
    startTime: Date,
    endTime: Date,
    bids: [{
      bidder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      bidderAccountId: String,
      amount: Number,
      timestamp: {
        type: Date,
        default: Date.now
      },
      transactionId: String
    }],
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    highestBidderAccountId: String
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled', 'expired', 'pending'],
    default: 'active'
  },

  // Sale Information
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  buyerAccountId: String,
  soldPrice: Number,
  soldAt: Date,

  // Transaction Details
  transactionId: String,
  explorerUrl: String,

  // Metadata
  metadata: {
    title: String,
    description: String,
    imageUrl: String,
    attributes: mongoose.Schema.Types.Mixed
  },

  // Visibility
  isVisible: {
    type: Boolean,
    default: true
  },

  // Featured
  isFeatured: {
    type: Boolean,
    default: false
  },

  // Statistics
  stats: {
    views: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    }
  },

  // Timestamps
  listedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  expiresAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
listingSchema.index({ tokenId: 1, serialNumber: 1 });
listingSchema.index({ seller: 1, status: 1 });
listingSchema.index({ status: 1, listingType: 1 });
listingSchema.index({ comic: 1, status: 1 });
listingSchema.index({ episode: 1, status: 1 });
listingSchema.index({ 'price.amount': 1 });
listingSchema.index({ listedAt: -1 });
listingSchema.index({ 'auction.endTime': 1 });

// Method to place bid (for auctions)
listingSchema.methods.placeBid = async function(bidderUser, bidderAccountId, amount, transactionId) {
  if (this.listingType !== 'auction') {
    throw new Error('This is not an auction listing');
  }

  if (this.status !== 'active') {
    throw new Error('Auction is not active');
  }

  if (amount <= this.auction.currentBid) {
    throw new Error(`Bid must be higher than current bid of ${this.auction.currentBid}`);
  }

  if (amount < this.auction.currentBid + this.auction.minimumBidIncrement) {
    throw new Error(`Bid must be at least ${this.auction.currentBid + this.auction.minimumBidIncrement}`);
  }

  // Add bid to history
  this.auction.bids.push({
    bidder: bidderUser,
    bidderAccountId,
    amount,
    timestamp: new Date(),
    transactionId
  });

  // Update current bid and highest bidder
  this.auction.currentBid = amount;
  this.auction.highestBidder = bidderUser;
  this.auction.highestBidderAccountId = bidderAccountId;

  await this.save();
  return this;
};

// Method to complete auction
listingSchema.methods.completeAuction = async function(transactionId) {
  if (this.listingType !== 'auction') {
    throw new Error('This is not an auction listing');
  }

  if (!this.auction.highestBidder) {
    this.status = 'expired';
  } else {
    this.status = 'sold';
    this.buyer = this.auction.highestBidder;
    this.buyerAccountId = this.auction.highestBidderAccountId;
    this.soldPrice = this.auction.currentBid;
    this.soldAt = new Date();
    this.transactionId = transactionId;
  }

  await this.save();
  return this;
};

// Method to complete sale (for fixed-price)
listingSchema.methods.completeSale = async function(buyerUser, buyerAccountId, transactionId, explorerUrl) {
  this.status = 'sold';
  this.buyer = buyerUser;
  this.buyerAccountId = buyerAccountId;
  this.soldPrice = this.price.amount;
  this.soldAt = new Date();
  this.transactionId = transactionId;
  this.explorerUrl = explorerUrl;

  await this.save();
  return this;
};

// Method to cancel listing
listingSchema.methods.cancel = async function() {
  if (this.status !== 'active') {
    throw new Error('Listing is not active');
  }

  this.status = 'cancelled';
  await this.save({ validateBeforeSave: false });
  return this;
};

// Check if auction has ended
listingSchema.methods.isAuctionEnded = function() {
  if (this.listingType !== 'auction') {
    return false;
  }
  return new Date() > this.auction.endTime;
};

// Increment views
listingSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  await this.save();
};

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;

