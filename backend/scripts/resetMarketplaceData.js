/**
 * Reset Marketplace Data Script
 *
 * This script clears all NFT, comic, and marketplace data while preserving user accounts.
 *
 * Collections cleared:
 * - Comics
 * - Episodes
 * - Listings
 * - MarketplaceTransactions
 * - ReadHistory
 *
 * Collections preserved:
 * - Users (accounts remain intact)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
import Comic from '../src/models/Comic.js';
import Episode from '../src/models/Episode.js';
import Listing from '../src/models/Listing.js';
import MarketplaceTransaction from '../src/models/MarketplaceTransaction.js';
import ReadHistory from '../src/models/ReadHistory.js';

const resetData = async () => {
  try {
    console.log('\n========================================');
    console.log('🧹 MARKETPLACE DATA RESET SCRIPT');
    console.log('========================================\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get counts before deletion
    console.log('📊 Current Data Counts:');
    const counts = {
      comics: await Comic.countDocuments(),
      episodes: await Episode.countDocuments(),
      listings: await Listing.countDocuments(),
      transactions: await MarketplaceTransaction.countDocuments(),
      readHistory: await ReadHistory.countDocuments(),
    };

    console.log(`   Comics: ${counts.comics}`);
    console.log(`   Episodes: ${counts.episodes}`);
    console.log(`   Listings: ${counts.listings}`);
    console.log(`   Transactions: ${counts.transactions}`);
    console.log(`   Read History: ${counts.readHistory}`);
    console.log('');

    // Confirm deletion
    console.log('⚠️  WARNING: This will delete all the above data!');
    console.log('⚠️  User accounts will be preserved.\n');

    // Wait 3 seconds to allow user to cancel
    console.log('⏳ Starting deletion in 3 seconds... (Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('⏳ 2...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('⏳ 1...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('');

    // Delete data
    console.log('🗑️  Deleting data...\n');

    const results = {
      readHistory: await ReadHistory.deleteMany({}),
      listings: await Listing.deleteMany({}),
      transactions: await MarketplaceTransaction.deleteMany({}),
      episodes: await Episode.deleteMany({}),
      comics: await Comic.deleteMany({}),
    };

    console.log('✅ Deletion Complete!\n');
    console.log('📊 Deleted Counts:');
    console.log(`   Read History: ${results.readHistory.deletedCount}`);
    console.log(`   Listings: ${results.listings.deletedCount}`);
    console.log(`   Transactions: ${results.transactions.deletedCount}`);
    console.log(`   Episodes: ${results.episodes.deletedCount}`);
    console.log(`   Comics: ${results.comics.deletedCount}`);
    console.log('');

    // Verify deletion
    console.log('✅ Verification:');
    const newCounts = {
      comics: await Comic.countDocuments(),
      episodes: await Episode.countDocuments(),
      listings: await Listing.countDocuments(),
      transactions: await MarketplaceTransaction.countDocuments(),
      readHistory: await ReadHistory.countDocuments(),
    };

    console.log(`   Comics: ${newCounts.comics}`);
    console.log(`   Episodes: ${newCounts.episodes}`);
    console.log(`   Listings: ${newCounts.listings}`);
    console.log(`   Transactions: ${newCounts.transactions}`);
    console.log(`   Read History: ${newCounts.readHistory}`);
    console.log('');

    if (Object.values(newCounts).every(count => count === 0)) {
      console.log('✅ SUCCESS! All marketplace data has been cleared.');
      console.log('👤 User accounts have been preserved.');
    } else {
      console.log('⚠️  WARNING: Some data may not have been deleted completely.');
    }

    console.log('\n========================================');
    console.log('🎉 Reset Complete!');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR during reset:');
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📡 Database connection closed.\n');
    process.exit(0);
  }
};

// Run the script
resetData();
