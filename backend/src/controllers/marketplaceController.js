import { Listing, Comic, Transaction, User, Offer } from '../models/index.js';
import hederaService from '../services/hederaService.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc    Create listing (fixed price or auction)
 * @route   POST /api/v1/marketplace/listings
 * @access  Private
 */
export const createListing = asyncHandler(async (req, res) => {
  const {
    comicId,
    serialNumber,
    price,
    listingType,
    auctionDuration,
    startingPrice,
    reservePrice
  } = req.body;

  const userId = req.user.id;

  // Verify comic and NFT ownership
  const comic = await Comic.findById(comicId).populate('collection');
  
  if (!comic) {
    return res.status(404).json({
      success: false,
      message: 'Comic not found'
    });
  }

  const nft = comic.nfts.find(n => 
    n.serialNumber === parseInt(serialNumber) &&
    n.owner.toString() === userId
  );

  if (!nft) {
    return res.status(403).json({
      success: false,
      message: 'You do not own this NFT'
    });
  }

  // Check if already listed
  const existingListing = await Listing.findOne({
    comic: comicId,
    serialNumber,
    status: 'active'
  });

  if (existingListing) {
    return res.status(400).json({
      success: false,
      message: 'This NFT is already listed'
    });
  }

  // Create listing
  const listingData = {
    comic: comicId,
    tokenId: comic.collection.tokenId,
    serialNumber: parseInt(serialNumber),
    seller: userId,
    sellerAccountId: req.user.hederaAccount.accountId,
    listingType,
    price: listingType === 'fixed-price' ? Math.floor(parseFloat(price)) : 0, // MUST be integer for Hbar
    status: 'active'
  };

  // Add auction details if auction
  if (listingType === 'auction') {
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + parseInt(auctionDuration));

    listingData.auction = {
      startingPrice: Math.floor(parseFloat(startingPrice)), // MUST be integer
      reservePrice: reservePrice ? Math.floor(parseFloat(reservePrice)) : Math.floor(parseFloat(startingPrice)),
      currentBid: Math.floor(parseFloat(startingPrice)), // MUST be integer
      startTime: new Date(),
      endTime,
      bids: []
    };
  }

  const listing = await Listing.create(listingData);
  await listing.populate('comic', 'title content.coverImage');
  await listing.populate('seller', 'username profile');

  logger.info(`Listing created: ${listing._id} by user ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Listing created successfully',
    data: { listing }
  });
});

/**
 * @desc    Buy NFT (fixed price)
 * @route   POST /api/v1/marketplace/listings/:listingId/buy
 * @access  Private
 */
export const buyNFT = asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  const { paymentTransactionId, status } = req.body;
  const userId = req.user.id;

  const listing = await Listing.findById(listingId)
    .populate('comic')
    .populate('seller');

  if (!listing || listing.status !== 'active') {
    return res.status(404).json({
      success: false,
      message: 'Listing not found or inactive'
    });
  }

  if (listing.listingType !== 'fixed-price') {
    return res.status(400).json({
      success: false,
      message: 'This is an auction listing, use bid endpoint'
    });
  }

  if (listing.seller._id.toString() === userId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot buy your own NFT'
    });
  }

  try {
    logger.info(`Processing NFT purchase. Payment TX: ${paymentTransactionId}`);

    // Step 1: Transfer NFT from seller to buyer using operator account
    logger.info('Transferring NFT ownership on blockchain...');
    const nftTransferTx = await hederaService.transferNFT({
      tokenId: listing.tokenId,
      serialNumber: listing.serialNumber,
      fromAccountId: listing.sellerAccountId,
      toAccountId: req.user.hederaAccount.accountId
    });

    logger.info(`NFT transfer executed: ${nftTransferTx.transactionId}`);

    // Step 2: Update listing status
    listing.status = 'sold';
    await listing.save();

    // Step 3: Update comic NFT owner in database
    const comic = listing.comic;
    const nft = comic.nfts.find(n => n.serialNumber === listing.serialNumber);
    nft.owner = userId;
    nft.ownerAccountId = req.user.hederaAccount.accountId;
    await comic.save();

    // Calculate fees
    const platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 2.5;
    const platformFee = (listing.price * platformFeePercentage) / 100;
    const royaltyPercentage = comic.collection?.royaltyPercentage || 10;
    const royaltyFee = (listing.price * royaltyPercentage) / 100;

    // Get Hedera network
    const network = process.env.HEDERA_NETWORK || 'testnet';
    const paymentExplorerUrl = `https://hashscan.io/${network}/transaction/${paymentTransactionId}`;
    const nftExplorerUrl = `https://hashscan.io/${network}/transaction/${nftTransferTx.transactionId}`;

    // Create transaction record
    const transaction = await Transaction.create({
      type: 'sale',
      comic: comic._id,
      tokenId: listing.tokenId,
      serialNumber: listing.serialNumber,
      from: {
        user: listing.seller._id,
        accountId: listing.sellerAccountId
      },
      to: {
        user: userId,
        accountId: req.user.hederaAccount.accountId
      },
      price: listing.price,
      currency: 'HBAR',
      platformFee,
      royaltyFee,
      transactionId: nftTransferTx.transactionId,
      explorerUrl: nftExplorerUrl,
      status: 'completed'
    });

    // Update stats
    comic.stats.sales += 1;
    comic.stats.totalVolume += listing.price;
    await comic.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('nft-sold', {
        listing: listingId,
        buyer: userId,
        seller: listing.seller._id,
        price: listing.price,
        comic: comic._id
      });
    }

    logger.info(`NFT sold: ${listingId} to user ${userId}`);

    res.json({
      success: true,
      message: 'NFT purchased successfully',
      data: {
        transaction,
        hedera: {
          paymentTransactionId,
          paymentExplorerUrl,
          nftTransactionId: nftTransferTx.transactionId,
          nftExplorerUrl
        }
      }
    });
  } catch (error) {
    logger.error('NFT purchase processing failed:', error);
    throw new Error('Failed to process NFT purchase: ' + error.message);
  }
});

/**
 * @desc    Place bid on auction
 * @route   POST /api/v1/marketplace/listings/:listingId/bid
 * @access  Private
 */
export const placeBid = asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  const { amount } = req.body;
  const userId = req.user.id;

  const listing = await Listing.findById(listingId).populate('comic');

  if (!listing || listing.status !== 'active') {
    return res.status(404).json({
      success: false,
      message: 'Listing not found or inactive'
    });
  }

  if (listing.listingType !== 'auction') {
    return res.status(400).json({
      success: false,
      message: 'This is not an auction listing'
    });
  }

  // Check auction hasn't ended
  if (new Date() > listing.auction.endTime) {
    listing.status = 'expired';
    await listing.save();
    return res.status(400).json({
      success: false,
      message: 'Auction has ended'
    });
  }

  if (listing.seller.toString() === userId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot bid on your own auction'
    });
  }

  const bidAmount = parseFloat(amount);

  // Validate bid amount
  if (bidAmount <= listing.auction.currentBid) {
    return res.status(400).json({
      success: false,
      message: `Bid must be higher than current bid of ${listing.auction.currentBid} HBAR`
    });
  }

  // Add bid
  listing.auction.bids.push({
    bidder: userId,
    bidderAccountId: req.user.hederaAccount.accountId,
    amount: bidAmount,
    timestamp: new Date()
  });

  listing.auction.currentBid = bidAmount;
  listing.auction.highestBidder = userId;
  listing.auction.highestBidderAccountId = req.user.hederaAccount.accountId;

  await listing.save();

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`auction-${listingId}`).emit('new-bid', {
      listingId,
      bidder: userId,
      amount: bidAmount,
      timestamp: new Date(),
      totalBids: listing.auction.bids.length
    });
  }

  logger.info(`Bid placed: ${bidAmount} HBAR on listing ${listingId} by user ${userId}`);

  res.json({
    success: true,
    message: 'Bid placed successfully',
    data: {
      currentBid: listing.auction.currentBid,
      totalBids: listing.auction.bids.length,
      isHighestBidder: true
    }
  });
});

/**
 * @desc    Complete auction (called when auction ends)
 * @route   POST /api/v1/marketplace/listings/:listingId/complete
 * @access  Private
 */
export const completeAuction = asyncHandler(async (req, res) => {
  const { listingId } = req.params;

  const listing = await Listing.findById(listingId)
    .populate('comic')
    .populate('seller');

  if (!listing) {
    return res.status(404).json({
      success: false,
      message: 'Listing not found'
    });
  }

  if (listing.listingType !== 'auction') {
    return res.status(400).json({
      success: false,
      message: 'This is not an auction'
    });
  }

  if (new Date() < listing.auction.endTime) {
    return res.status(400).json({
      success: false,
      message: 'Auction has not ended yet'
    });
  }

  if (listing.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'Auction already completed or cancelled'
    });
  }

  // Check if reserve price met
  if (listing.auction.currentBid < listing.auction.reservePrice) {
    listing.status = 'expired';
    await listing.save();
    
    return res.json({
      success: true,
      message: 'Auction ended - reserve price not met',
      data: { listing }
    });
  }

  // Transfer NFT to highest bidder
  try {
    const transfer = await hederaService.transferNFT({
      tokenId: listing.tokenId,
      serialNumber: listing.serialNumber,
      fromAccountId: listing.sellerAccountId,
      toAccountId: listing.auction.highestBidderAccountId,
      price: listing.auction.currentBid
    });

    // Update listing
    listing.status = 'sold';
    await listing.save();

    // Update comic
    const comic = listing.comic;
    const nft = comic.nfts.find(n => n.serialNumber === listing.serialNumber);
    nft.owner = listing.auction.highestBidder;
    nft.ownerAccountId = listing.auction.highestBidderAccountId;
    await comic.save();

    // Create transaction
    const transaction = await Transaction.create({
      type: 'auction-win',
      comic: comic._id,
      tokenId: listing.tokenId,
      serialNumber: listing.serialNumber,
      from: {
        user: listing.seller._id,
        accountId: listing.sellerAccountId
      },
      to: {
        user: listing.auction.highestBidder,
        accountId: listing.auction.highestBidderAccountId
      },
      price: listing.auction.currentBid,
      transactionId: transfer.transactionId,
      explorerUrl: transfer.explorerUrl,
      status: 'completed'
    });

    logger.info(`Auction completed: ${listingId}`);

    res.json({
      success: true,
      message: 'Auction completed successfully',
      data: {
        transaction,
        hedera: {
          transactionId: transfer.transactionId,
          explorerUrl: transfer.explorerUrl
        }
      }
    });
  } catch (error) {
    logger.error('Auction completion failed:', error);
    throw new Error('Failed to complete auction: ' + error.message);
  }
});

/**
 * @desc    Cancel listing
 * @route   DELETE /api/v1/marketplace/listings/:listingId
 * @access  Private
 */
export const cancelListing = asyncHandler(async (req, res) => {
  const { listingId } = req.params;
  const userId = req.user.id;

  const listing = await Listing.findById(listingId);

  if (!listing) {
    return res.status(404).json({
      success: false,
      message: 'Listing not found'
    });
  }

  if (listing.seller.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'You can only cancel your own listings'
    });
  }

  if (listing.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'Listing is not active'
    });
  }

  // Don't allow cancelling auction with bids
  if (listing.listingType === 'auction' && listing.auction.bids.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel auction with active bids'
    });
  }

  listing.status = 'cancelled';
  await listing.save();

  logger.info(`Listing cancelled: ${listingId} by user ${userId}`);

  res.json({
    success: true,
    message: 'Listing cancelled successfully'
  });
});

/**
 * @desc    Get all listings
 * @route   GET /api/v1/marketplace/listings
 * @access  Public
 */
export const getListings = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    listingType,
    minPrice,
    maxPrice,
    status = 'active',
    sortBy = 'createdAt',
    order = 'desc',
    seller
  } = req.query;

  const query = { status };

  if (seller) query.seller = seller;
  if (listingType) query.listingType = listingType;
  if (minPrice) query.price = { $gte: parseFloat(minPrice) };
  if (maxPrice) query.price = { ...query.price, $lte: parseFloat(maxPrice) };

  const sortOptions = {};
  sortOptions[sortBy] = order === 'desc' ? -1 : 1;

  const listings = await Listing.find(query)
    .populate({
      path: 'comic',
      select: 'title content.coverImage pageCount genre collection tokenId',
      populate: {
        path: 'collection',
        select: 'tokenId name symbol'
      }
    })
    .populate('seller', 'username profile.displayName profile.avatar accountId')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort(sortOptions);

  const count = await Listing.countDocuments(query);

  res.json({
    success: true,
    data: {
      listings,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    }
  });
});

/**
 * @desc    Get listing by ID
 * @route   GET /api/v1/marketplace/listings/:listingId
 * @access  Public
 */
export const getListingById = asyncHandler(async (req, res) => {
  const { listingId } = req.params;

  const listing = await Listing.findById(listingId)
    .populate('comic')
    .populate('seller', 'username profile creatorProfile')
    .populate('auction.highestBidder', 'username profile');

  if (!listing) {
    return res.status(404).json({
      success: false,
      message: 'Listing not found'
    });
  }

  // Increment views
  listing.views += 1;
  await listing.save();

  res.json({
    success: true,
    data: { listing }
  });
});

/**
 * @desc    Make offer on NFT
 * @route   POST /api/v1/marketplace/offers
 * @access  Private
 */
export const makeOffer = asyncHandler(async (req, res) => {
  const { comicId, serialNumber, amount, message } = req.body;
  const userId = req.user.id;

  const comic = await Comic.findById(comicId);
  
  if (!comic) {
    return res.status(404).json({
      success: false,
      message: 'Comic not found'
    });
  }

  const nft = comic.nfts.find(n => n.serialNumber === parseInt(serialNumber));
  
  if (!nft) {
    return res.status(404).json({
      success: false,
      message: 'NFT not found'
    });
  }

  if (nft.owner.toString() === userId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot make an offer on your own NFT'
    });
  }

  // Create offer
  const offer = await Offer.create({
    comic: comicId,
    tokenId: comic.collection.tokenId,
    serialNumber: parseInt(serialNumber),
    offerer: userId,
    offererAccountId: req.user.hederaAccount.accountId,
    owner: nft.owner,
    amount: parseFloat(amount),
    message,
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  logger.info(`Offer made: ${offer._id} by user ${userId}`);

  res.status(201).json({
    success: true,
    message: 'Offer submitted successfully',
    data: { offer }
  });
});

/**
 * @desc    Accept/Reject offer
 * @route   PUT /api/v1/marketplace/offers/:offerId
 * @access  Private
 */
export const respondToOffer = asyncHandler(async (req, res) => {
  const { offerId } = req.params;
  const { action } = req.body; // 'accept' or 'reject'
  const userId = req.user.id;

  const offer = await Offer.findById(offerId).populate('comic');

  if (!offer) {
    return res.status(404).json({
      success: false,
      message: 'Offer not found'
    });
  }

  if (offer.owner.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Only the NFT owner can respond to offers'
    });
  }

  if (offer.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Offer has already been responded to'
    });
  }

  if (action === 'accept') {
    // Transfer NFT
    try {
      const transfer = await hederaService.transferNFT({
        tokenId: offer.tokenId,
        serialNumber: offer.serialNumber,
        fromAccountId: req.user.hederaAccount.accountId,
        toAccountId: offer.offererAccountId,
        price: offer.amount
      });

      offer.status = 'accepted';
      await offer.save();

      // Update comic
      const comic = offer.comic;
      const nft = comic.nfts.find(n => n.serialNumber === offer.serialNumber);
      nft.owner = offer.offerer;
      nft.ownerAccountId = offer.offererAccountId;
      await comic.save();

      // Create transaction
      await Transaction.create({
        type: 'sale',
        comic: comic._id,
        tokenId: offer.tokenId,
        serialNumber: offer.serialNumber,
        from: {
          user: userId,
          accountId: req.user.hederaAccount.accountId
        },
        to: {
          user: offer.offerer,
          accountId: offer.offererAccountId
        },
        price: offer.amount,
        transactionId: transfer.transactionId,
        explorerUrl: transfer.explorerUrl,
        status: 'completed'
      });

      res.json({
        success: true,
        message: 'Offer accepted and NFT transferred',
        data: {
          hedera: {
            transactionId: transfer.transactionId,
            explorerUrl: transfer.explorerUrl
          }
        }
      });
    } catch (error) {
      logger.error('Offer acceptance failed:', error);
      throw new Error('Failed to accept offer: ' + error.message);
    }
  } else {
    offer.status = 'rejected';
    await offer.save();

    res.json({
      success: true,
      message: 'Offer rejected'
    });
  }
});

export default {
  createListing,
  buyNFT,
  placeBid,
  completeAuction,
  cancelListing,
  getListings,
  getListingById,
  makeOffer,
  respondToOffer
};