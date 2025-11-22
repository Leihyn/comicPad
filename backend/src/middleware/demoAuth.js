import { User } from '../models/index.js';
import mongoose from 'mongoose';

// Single demo user ID for all requests (consistent across the session)
const DEMO_USER_ID = new mongoose.Types.ObjectId();

/**
 * Demo Auth Middleware
 * Uses the wallet provided in request headers or a default wallet
 */
export const demoProtect = async (req, res, next) => {
  try {
    // Get wallet from request header (sent by frontend)
    const walletFromHeader = req.headers['x-wallet-account'] || req.headers['x-hedera-account'];
    const defaultWallet = '0.0.7163232';
    const accountId = walletFromHeader || defaultWallet;

    console.log('🔑 Demo Auth - Using wallet:', accountId, walletFromHeader ? '(from header)' : '(default)');

    // Try to find or create user with this wallet
    let user = await User.findOne({ 'wallet.accountId': accountId });

    if (!user) {
      // Create a user for this wallet
      const username = `user_${accountId.replace(/\./g, '_')}`;
      user = await User.create({
        wallet: { accountId, connected: true, connectedAt: new Date() },
        username,
        email: `${username}@demo.local`,
        password: 'demo_password_not_used', // Required by schema
        isCreator: true
      });
      console.log('✅ Created demo user for wallet:', accountId);
    }

    // Use this user for the request
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      wallet: user.wallet || { accountId },
      hederaAccount: user.wallet || { accountId },
      username: user.username,
      email: user.email,
      isCreator: user.isCreator
    };

    next();
  } catch (error) {
    console.error('Demo auth error:', error);
    // Fallback: use default wallet
    const defaultWallet = req.headers['x-wallet-account'] || '0.0.7163232';
    req.user = {
      id: DEMO_USER_ID.toString(),
      _id: DEMO_USER_ID,
      wallet: { accountId: defaultWallet },
      hederaAccount: { accountId: defaultWallet },
      username: 'demo_user',
      email: 'demo@example.com',
      isCreator: true
    };
    next();
  }
};
