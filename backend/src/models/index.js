import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// User Schema
const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false  // Don't return password by default
  },
  role: {
    type: String,
    enum: ['user', 'creator', 'admin'],
    default: 'user'
  },
  profile: {
    displayName: String,
    bio: String,
    avatar: String,
    coverImage: String,
    website: String,
    twitter: String,
    discord: String,
    instagram: String
  },
  wallet: {
    accountId: String,
    publicKey: String,
    connected: {
      type: Boolean,
      default: false
    },
    connectedAt: Date
  },
  hederaAccount: {
    accountId: String,
    publicKey: String,
    associatedTokens: [String]
  },
  walletAddress: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  isCreator: {
    type: Boolean,
    default: false
  },
  creatorProfile: {
    verified: {
      type: Boolean,
      default: false
    },
    verificationDate: Date,
    totalSales: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalComics: {
      type: Number,
      default: 0
    },
    followers: {
      type: Number,
      default: 0
    }
  },
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  favorites: [{
    type: Schema.Types.ObjectId,
    ref: 'Comic'
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['sale', 'purchase', 'follow', 'comment', 'system']
    },
    message: String,
    link: String,
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    newsletter: {
      type: Boolean,
      default: false
    },
    showProfile: {
      type: Boolean,
      default: true
    },
    notifications: {
      email: { type: Boolean, default: true },
      sales: { type: Boolean, default: true },
      newFollowers: { type: Boolean, default: true }
    },
    privacy: {
      showEmail: { type: Boolean, default: false },
      showWallet: { type: Boolean, default: true }
    }
  },
  lastLogin: Date
}, {
  timestamps: true
});

// ⭐ CRITICAL: Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ⭐ CRITICAL: Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Collection Schema
const collectionSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  description: String,
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenId: {
    type: String,
    required: true,
    unique: true
  },
  supplyKey: {
    type: String,
    required: true
  },
  royaltyPercentage: {
    type: Number,
    default: 10,
    min: 5,
    max: 25
  },
  maxSupply: {
    type: Number,
    default: 0
  },
  totalMinted: {
    type: Number,
    default: 0
  },
  coverImage: String,
  bannerImage: String,
  category: {
    type: String,
    enum: ['superhero', 'manga', 'horror', 'sci-fi', 'fantasy', 'indie', 'webcomic', 'other']
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  floorPrice: Number,
  stats: {
    totalVolume: {
      type: Number,
      default: 0
    },
    floorPrice: Number,
    lastSalePrice: Number,
    holders: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Comic Schema
const comicSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  collection: {
    type: Schema.Types.ObjectId,
    ref: 'Collection',
    required: true
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  issueNumber: Number,
  series: String,
  publicationDate: Date,
  genre: [String],
  category: String,
  artists: [String],
  writers: [String],
  colorists: [String],
  letterers: [String],
  coverArtist: String,
  pageCount: {
    type: Number,
    required: true
  },
  edition: {
    type: String,
    enum: ['standard', 'limited', 'rare', 'ultra-rare', 'one-of-one'],
    default: 'standard'
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  supply: {
    type: Number,
    default: 1
  },
  minted: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'HBAR'
  },
  content: {
    metadataUri: String,
    metadataHash: String,
    coverImage: String,
    pages: [{
      pageNumber: Number,
      original: String,
      web: String,
      thumbnail: String
    }],
    downloads: {
      cbz: String,
      pdf: String
    }
  },
  nfts: [{
    serialNumber: Number,
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    ownerAccountId: String,
    mintedAt: Date,
    transactionId: String
  }],
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'sold-out', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  stats: {
    views: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    },
    sales: {
      type: Number,
      default: 0
    },
    totalVolume: {
      type: Number,
      default: 0
    },
    averageRating: Number,
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  features: {
    isAnimated: {
      type: Boolean,
      default: false
    },
    hasAudio: {
      type: Boolean,
      default: false
    },
    isInteractive: {
      type: Boolean,
      default: false
    },
    hasAR: {
      type: Boolean,
      default: false
    }
  },
  bonusContent: [{
    type: String,
    title: String,
    description: String,
    url: String
  }]
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Listing Schema
const listingSchema = new Schema({
  comic: {
    type: Schema.Types.ObjectId,
    ref: 'Comic',
    required: true
  },
  tokenId: {
    type: String,
    required: true
  },
  serialNumber: {
    type: Number,
    required: true
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerAccountId: {
    type: String,
    required: true
  },
  listingType: {
    type: String,
    enum: ['fixed-price', 'auction'],
    default: 'fixed-price'
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'HBAR'
  },
  auction: {
    startingPrice: Number,
    reservePrice: Number,
    currentBid: Number,
    highestBidder: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    highestBidderAccountId: String,
    bids: [{
      bidder: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      bidderAccountId: String,
      amount: Number,
      timestamp: Date
    }],
    startTime: Date,
    endTime: Date
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled', 'expired'],
    default: 'active'
  },
  expiresAt: Date,
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Transaction Schema
const transactionSchema = new Schema({
  type: {
    type: String,
    enum: ['mint', 'sale', 'transfer', 'auction-win'],
    required: true
  },
  comic: {
    type: Schema.Types.ObjectId,
    ref: 'Comic'
  },
  tokenId: String,
  serialNumber: Number,
  from: {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    accountId: String
  },
  to: {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    accountId: String
  },
  price: Number,
  currency: {
    type: String,
    default: 'HBAR'
  },
  platformFee: Number,
  royaltyFee: Number,
  transactionId: {
    type: String,
    required: true
  },
  explorerUrl: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Review Schema
const reviewSchema = new Schema({
  comic: {
    type: Schema.Types.ObjectId,
    ref: 'Comic',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: String,
  content: String,
  verified: {
    type: Boolean,
    default: false
  },
  helpful: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  reported: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Reading Progress Schema
const readingProgressSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comic: {
    type: Schema.Types.ObjectId,
    ref: 'Comic',
    required: true
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: Number,
  completed: {
    type: Boolean,
    default: false
  },
  bookmarks: [{
    pageNumber: Number,
    note: String,
    createdAt: Date
  }],
  lastReadAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Offer Schema
const offerSchema = new Schema({
  comic: {
    type: Schema.Types.ObjectId,
    ref: 'Comic',
    required: true
  },
  tokenId: String,
  serialNumber: Number,
  offerer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  offererAccountId: String,
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'HBAR'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  message: String,
  expiresAt: Date
}, {
  timestamps: true
});

// Notification Schema
const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['sale', 'purchase', 'follow', 'comment', 'system'],
    required: true
  },
  message: String,
  link: String,
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create models
export const User = mongoose.model('User', userSchema);
export const Collection = mongoose.model('Collection', collectionSchema);
export const Comic = mongoose.model('Comic', comicSchema);
export const Listing = mongoose.model('Listing', listingSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const Review = mongoose.model('Review', reviewSchema);
export const ReadingProgress = mongoose.model('ReadingProgress', readingProgressSchema);
export const Offer = mongoose.model('Offer', offerSchema);
export const Notification = mongoose.model('Notification', notificationSchema);