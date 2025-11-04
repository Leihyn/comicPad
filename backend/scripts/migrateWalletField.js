// Migrate hederaAccount to wallet field for all users
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const migrateWalletField = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Find all users with hederaAccount but no wallet.accountId
    const users = await User.find({
      'hederaAccount.accountId': { $exists: true },
      'wallet.accountId': { $exists: false }
    });

    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'wallet.accountId': user.hederaAccount.accountId,
            'wallet.publicKey': user.hederaAccount.publicKey,
            'wallet.connected': true,
            'wallet.connectedAt': user.hederaAccount.connectedAt || new Date()
          },
          $unset: { hederaAccount: 1 }
        }
      );
      console.log(`✅ Migrated user: ${user.hederaAccount.accountId}`);
    }

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateWalletField();
