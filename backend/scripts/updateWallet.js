// Quick script to update user wallet field
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Define User schema inline
const userSchema = new mongoose.Schema({
  username: String,
  wallet: {
    accountId: String,
    publicKey: String,
    connected: Boolean,
    connectedAt: Date
  }
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function updateUserWallet() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Your wallet account ID
    const accountId = '0.0.7163232'; // UPDATE THIS if different

    // Find user by username or hederaAccount
    const user = await User.findOne({
      $or: [
        { username: 'user_0_0_7163232' },
        { 'hederaAccount.accountId': accountId }
      ]
    });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('Found user:', user.username);

    // Update wallet field
    const result = await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'wallet.accountId': accountId,
          'wallet.connected': true,
          'wallet.connectedAt': new Date()
        },
        $unset: {
          hederaAccount: 1 // Remove old field
        }
      }
    );

    console.log('✅ Updated user wallet:', result);
    console.log('✅ Wallet account ID set to:', accountId);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateUserWallet();
