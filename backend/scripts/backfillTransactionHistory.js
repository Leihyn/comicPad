// backend/scripts/backfillTransactionHistory.js
// Script to backfill transaction history from existing completed listings

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import { Listing, MarketplaceTransaction } from '../src/models/index.js';

async function backfillTransactionHistory() {
  try {
    console.log('🔄 Starting transaction history backfill...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all sold listings
    const soldListings = await Listing.find({
      status: 'sold'
    }).populate('episode').populate('comic');

    console.log(`📊 Found ${soldListings.length} sold listings to backfill`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const listing of soldListings) {
      try {
        // Check if transaction already exists
        const existingTx = await MarketplaceTransaction.findOne({
          listingId: listing._id
        });

        if (existingTx) {
          console.log(`⏭️  Transaction already exists for listing ${listing._id}`);
          skipped++;
          continue;
        }

        // Calculate fees
        const salePrice = listing.price?.amount || 0;
        const platformFeePercent = 2.5;
        const royaltyPercent = listing.comic?.royaltyPercentage || 0;
        const platformFee = salePrice * (platformFeePercent / 100);
        const royaltyFee = salePrice * (royaltyPercent / 100);
        const totalFees = platformFee + royaltyFee;

        // Create transaction record
        const transaction = new MarketplaceTransaction({
          type: listing.listingType === 'auction' ? 'auction_complete' : 'purchase',
          status: 'completed',
          buyer: {
            userId: listing.buyer,
            accountId: listing.buyerAccountId
          },
          seller: {
            userId: listing.seller,
            accountId: listing.sellerAccountId
          },
          nft: {
            tokenId: listing.tokenId,
            serialNumber: listing.serialNumber,
            comicId: listing.comic?._id,
            episodeId: listing.episode?._id
          },
          listingId: listing._id,
          price: {
            amount: salePrice,
            currency: listing.price?.currency || 'HBAR'
          },
          fees: {
            platformFee,
            royaltyFee,
            totalFees
          },
          hederaTransaction: {
            transactionId: listing.transactionId || 'unknown',
            explorerUrl: listing.explorerUrl || `https://hashscan.io/testnet/transaction/${listing.transactionId}`
          },
          initiatedAt: listing.createdAt,
          completedAt: listing.soldAt || listing.updatedAt
        });

        await transaction.save();
        console.log(`✅ Created transaction for listing ${listing._id} (${listing.tokenId}/${listing.serialNumber})`);
        created++;

      } catch (error) {
        console.error(`❌ Error processing listing ${listing._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Backfill Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${soldListings.length}`);

    console.log('\n✅ Backfill completed!');

  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the backfill
backfillTransactionHistory();
