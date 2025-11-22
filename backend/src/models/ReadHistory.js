// backend/src/models/ReadHistory.js
import mongoose from 'mongoose';

const readHistorySchema = new mongoose.Schema({
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userAccountId: {
    type: String,
    required: true
  },

  // Content Information
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

  // Access Details
  accessType: {
    type: String,
    enum: ['nft-owner', 'paid-access', 'free', 'preview', 'creator'],
    required: true
  },

  // NFT Ownership (if applicable)
  nftTokenId: String,
  nftSerialNumber: Number,

  // Payment (if applicable)
  paymentAmount: {
    type: Number,
    default: 0
  },
  paymentCurrency: {
    type: String,
    enum: ['HBAR', 'USDT']
  },
  paymentTransactionId: String,

  // Reading Progress
  progress: {
    currentPage: {
      type: Number,
      default: 1
    },
    totalPages: Number,
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  },

  // Session Information
  sessions: [{
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: Date,
    duration: Number, // in seconds
    pagesRead: [Number],
    device: String,
    ipAddress: String
  }],

  // Rating & Review
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: {
    text: String,
    createdAt: Date,
    edited: Boolean,
    editedAt: Date
  },

  // Statistics
  totalTimeSpent: {
    type: Number,
    default: 0 // in seconds
  },
  totalSessions: {
    type: Number,
    default: 0
  },

  // First and Last Access
  firstAccessedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes
readHistorySchema.index({ user: 1, episode: 1 }, { unique: true });
readHistorySchema.index({ user: 1, comic: 1 });
readHistorySchema.index({ userAccountId: 1 });
readHistorySchema.index({ episode: 1 });
readHistorySchema.index({ comic: 1 });
readHistorySchema.index({ lastAccessedAt: -1 });

// Method to update progress
readHistorySchema.methods.updateProgress = async function(currentPage, totalPages) {
  this.progress.currentPage = currentPage;
  this.progress.totalPages = totalPages;
  this.progress.percentage = Math.round((currentPage / totalPages) * 100);

  if (currentPage >= totalPages) {
    this.progress.completed = true;
    this.progress.completedAt = new Date();
  }

  this.lastAccessedAt = new Date();
  await this.save();
};

// Method to start new session
readHistorySchema.methods.startSession = async function(device, ipAddress) {
  this.sessions.push({
    startTime: new Date(),
    device,
    ipAddress,
    pagesRead: []
  });

  this.totalSessions += 1;
  this.lastAccessedAt = new Date();
  await this.save();

  return this.sessions[this.sessions.length - 1];
};

// Method to end session
readHistorySchema.methods.endSession = async function() {
  if (this.sessions.length === 0) return;

  const currentSession = this.sessions[this.sessions.length - 1];
  if (currentSession.endTime) return; // Already ended

  currentSession.endTime = new Date();
  currentSession.duration = Math.round((currentSession.endTime - currentSession.startTime) / 1000);

  this.totalTimeSpent += currentSession.duration;
  await this.save();
};

// Method to add rating
readHistorySchema.methods.addRating = async function(rating, reviewText) {
  this.rating = rating;

  if (reviewText) {
    this.review = {
      text: reviewText,
      createdAt: new Date(),
      edited: false
    };
  }

  await this.save();
};

const ReadHistory = mongoose.model('ReadHistory', readHistorySchema);

export default ReadHistory;
