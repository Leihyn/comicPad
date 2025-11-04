// backend/src/models/Comic.js
import mongoose from 'mongoose';

const comicSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Comic title is required'],
    trim: true,
    maxlength: [200, 'Title must be less than 200 characters']
  },
  description: {
    type: String,
    default: '',
    maxlength: [2000, 'Description must be less than 2000 characters']
  },
  series: {
    type: String,
    trim: true
  },

  // Creator Information
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorAccountId: {
    type: String,
    required: [true, 'Creator Hedera account ID is required']
  },

  // NFT Collection Details
  collectionTokenId: {
    type: String,
    required: [true, 'Collection token ID is required'],
    unique: true
  },

  // Metadata
  genres: [{
    type: String,
    enum: ['action', 'adventure', 'comedy', 'drama', 'fantasy', 'horror', 'mystery', 'romance', 'sci-fi', 'superhero', 'thriller', 'other']
  }],
  tags: [String],

  // Cover & Media
  coverImage: {
    ipfsHash: String,
    url: String
  },
  bannerImage: {
    ipfsHash: String,
    url: String
  },

  // Royalty Settings
  royaltyPercentage: {
    type: Number,
    default: 10,
    min: 0,
    max: 50
  },

  // Supply Settings
  maxSupply: {
    type: Number,
    default: 0, // 0 = unlimited
    min: 0
  },

  // Statistics
  stats: {
    totalEpisodes: {
      type: Number,
      default: 0
    },
    totalMinted: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    totalReads: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  isLive: {
    type: Boolean,
    default: false
  },

  // Settings
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    isMature: {
      type: Boolean,
      default: false
    },
    isPublic: {
      type: Boolean,
      default: true
    }
  },

  // Timestamps
  publishedAt: Date,
  completedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
comicSchema.index({ creator: 1, status: 1 });
// collectionTokenId already has unique index via schema definition
comicSchema.index({ status: 1, isLive: 1 });
comicSchema.index({ genres: 1 });
comicSchema.index({ 'stats.totalViews': -1 });
comicSchema.index({ createdAt: -1 });

// Virtual for episodes
comicSchema.virtual('episodes', {
  ref: 'Episode',
  localField: '_id',
  foreignField: 'comic'
});

// Method to increment stats
comicSchema.methods.incrementStats = async function(field, value = 1) {
  this.stats[field] = (this.stats[field] || 0) + value;
  await this.save();
};

const Comic = mongoose.model('Comic', comicSchema);

export default Comic;
