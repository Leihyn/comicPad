import { useCallback, useContext, useEffect } from 'react';
import {
  AccountAllowanceApproveTransaction,
  AccountId,
  ContractExecuteTransaction,
  ContractId,
  Hbar,
  LedgerId,
  NftId,
  TokenAssociateTransaction,
  TokenId,
  TransferTransaction,
} from "@hashgraph/sdk";
import { ContractFunctionParameterBuilder } from "./contractFunctionParameterBuilder";
import {
  DAppConnector,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  HederaChainId
} from "@hashgraph/hedera-wallet-connect";
import EventEmitter from "events";
import { WalletConnectContext } from "../../contexts/WalletConnectContext";
import axios from 'axios';
import toast from 'react-hot-toast';

// Created refreshEvent because dappConnector event listeners need manual sync
const refreshEvent = new EventEmitter();
refreshEvent.setMaxListeners(20); // Increase to prevent warning

// API configuration
const API_BASE = 'http://localhost:3001/api/v1';

// WalletConnect Project ID - Create yours at https://cloud.walletconnect.com
const walletConnectProjectId = "377d75bb6f86a2ffd427d032ff6ea7d3";
const hederaNetwork = "testnet";

// Metadata for your dApp
const metadata = {
  name: "ComicPad",
  description: "Decentralized comic book publishing powered by Hedera Hashgraph",
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: [typeof window !== 'undefined' ? window.location.origin + "/logo.png" : ''],
};

// Initialize DAppConnector (singleton pattern)
let dappConnector = null;

const getDAppConnector = () => {
  if (!dappConnector && typeof window !== 'undefined') {
    dappConnector = new DAppConnector(
      metadata,
      LedgerId.fromString(hederaNetwork),
      walletConnectProjectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [HederaChainId.Testnet],
    );
  }
  return dappConnector;
};

// Ensure WalletConnect is initialized only once
let walletConnectInitPromise = undefined;
const initializeWalletConnect = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Cannot initialize WalletConnect on server side');
  }

  if (walletConnectInitPromise === undefined) {
    const connector = getDAppConnector();
    if (!connector) {
      throw new Error('Failed to create DAppConnector');
    }
    walletConnectInitPromise = connector.init().catch((error) => {
      // Reset promise on error so it can be retried
      walletConnectInitPromise = undefined;
      throw error;
    });
  }

  await walletConnectInitPromise;
};

// Clear stale WalletConnect sessions
export const clearWalletConnectSessions = () => {
  try {
    // Clear WalletConnect storage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('wc@2') || key.startsWith('wc_') || key.includes('walletconnect'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('🧹 Cleared WalletConnect sessions:', keysToRemove.length);

    // Reset connector
    if (dappConnector) {
      dappConnector.disconnectAll().catch(() => {});
    }
    dappConnector = null;
    walletConnectInitPromise = undefined;
  } catch (error) {
    console.error('Failed to clear sessions:', error);
  }
};

// Clear only expired proposals (not active sessions)
const clearExpiredProposals = () => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Only clear proposals, not active sessions
      if (key && key.includes('wc@2:core:pairing:')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const data = JSON.parse(value);
            // Check if expired
            if (data.expiry && data.expiry * 1000 < Date.now()) {
              keysToRemove.push(key);
            }
          }
        } catch (e) {
          // If we can't parse it, it's probably corrupted, remove it
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (keysToRemove.length > 0) {
      console.log('🧹 Cleared expired proposals:', keysToRemove.length);
    }
  } catch (error) {
    console.error('Failed to clear expired proposals:', error);
  }
};

// Detect if HashPack extension is available
const isHashPackExtensionAvailable = () => {
  return typeof window !== 'undefined' && window.hashpack !== undefined;
};

// Try to connect using HashPack extension directly (fallback method)
export const connectHashPackExtension = async () => {
  try {
    console.log('🔵 Attempting direct HashPack extension connection...');
    toast.loading('Connecting to HashPack extension...', { id: 'wallet-connect' });

    await initializeWalletConnect();
    const connector = getDAppConnector();

    if (!connector) {
      throw new Error('WalletConnect connector not available');
    }

    // Try to use connectExtension if available
    if (typeof connector.connectExtension === 'function') {
      console.log('🔵 Using connectExtension method...');
      const session = await connector.connectExtension('hashpack');
      console.log('✅ Connected via extension:', session);
      toast.success('Wallet connected!', { id: 'wallet-connect' });
      refreshEvent.emit("sync");
      return session;
    }

    throw new Error('Extension connection not available');
  } catch (error) {
    console.error('❌ Extension connection failed:', error);
    throw error;
  }
};

// Open HashPack connection modal
export const openHashPackModal = async () => {
  try {
    console.log('🔵 ========== WALLET CONNECTION START ==========');
    console.log('🔵 Step 1: Clearing expired proposals...');
    clearExpiredProposals();

    console.log('🔵 Step 2: Checking environment...');
    console.log('   - Window object available:', typeof window !== 'undefined');
    console.log('   - HashPack extension:', isHashPackExtensionAvailable());
    console.log('   - WalletConnect project ID:', walletConnectProjectId);

    console.log('🔵 Step 3: Initializing WalletConnect...');
    toast.loading('Initializing wallet connection...', { id: 'wallet-connect' });

    try {
      await initializeWalletConnect();
      console.log('✅ WalletConnect initialized successfully');
    } catch (initError) {
      console.error('❌ WalletConnect initialization failed:', initError);
      toast.error('Failed to initialize wallet. Please refresh the page.', { id: 'wallet-connect' });
      throw new Error(`Initialization failed: ${initError.message}`);
    }

    const connector = getDAppConnector();
    if (!connector) {
      console.error('❌ Connector not available after init');
      toast.error('Wallet connector unavailable. Please refresh the page.', { id: 'wallet-connect' });
      throw new Error('WalletConnect connector not available');
    }
    console.log('✅ Connector available');

    // Check if already connected
    if (connector.signers && connector.signers.length > 0) {
      const accountId = connector.signers[0]?.getAccountId()?.toString();
      console.log('✅ Already connected to wallet:', accountId);
      toast.success(`Already connected: ${accountId}`, { id: 'wallet-connect' });
      refreshEvent.emit("sync");
      return;
    }

    console.log('✅ Step 4: Connector ready, attempting connection...');

    // Check if HashPack extension is available
    const hasExtension = isHashPackExtensionAvailable();
    console.log('🔍 HashPack extension check:', {
      available: hasExtension,
      windowHashpack: typeof window?.hashpack,
      connectorMethods: typeof connector.connectExtension
    });

    // If extension is available, try direct connection first
    if (hasExtension && typeof connector.connectExtension === 'function') {
      try {
        console.log('🔵 Attempting direct extension connection...');
        toast.loading('Connecting to HashPack extension...', { id: 'wallet-connect' });

        const session = await connector.connectExtension('hashpack');
        console.log('✅ Connected via extension!', session);

        const accountId = connector.signers[0]?.getAccountId()?.toString();
        toast.success(`Connected: ${accountId}`, { id: 'wallet-connect' });
        refreshEvent.emit("sync");
        return session;
      } catch (extError) {
        console.warn('⚠️ Extension connection failed:', extError.message);
        console.log('🔄 Falling back to QR code modal...');
      }
    } else if (!hasExtension) {
      console.log('ℹ️ HashPack extension not found - will use QR code');
      toast('HashPack extension not found. You can scan QR code with mobile app.', {
        id: 'wallet-connect',
        icon: 'ℹ️',
        duration: 3000
      });
    }

    // Fallback to modal method (QR code)
    console.log('🔵 Opening WalletConnect modal (QR code)...');
    toast.loading('Opening connection modal...', { id: 'wallet-connect' });

    // Suppress the deep link error by catching it
    const originalError = console.error;
    console.error = (...args) => {
      const errorStr = args.join(' ');
      if (errorStr.includes('Failed to launch') && errorStr.includes('wc:')) {
        return; // Suppress deep link errors
      }
      originalError.apply(console, args);
    };

    try {
      console.log('⏳ Waiting for user to scan QR code or approve connection...');
      console.log('   Timeout: 60 seconds');

      const session = await Promise.race([
        connector.openModal(undefined, false),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout after 60 seconds')), 60000)
        )
      ]);

      console.log('✅ Session established!');
      const accountId = connector.signers[0]?.getAccountId()?.toString();
      console.log('   Account ID:', accountId);

      toast.success(`Wallet connected: ${accountId}`, { id: 'wallet-connect' });
      refreshEvent.emit("sync");
      console.log('🔵 ========== WALLET CONNECTION SUCCESS ==========');
      return session;
    } finally {
      console.error = originalError;
    }
  } catch (error) {
    console.error('❌ ========== WALLET CONNECTION FAILED ==========');
    console.error('Error:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Handle specific error types with actionable messages
    if (error.message?.includes('Proposal expired')) {
      console.log('🔄 Clearing expired sessions...');
      clearWalletConnectSessions();
      toast.error('Connection expired. Please refresh and try again.', {
        id: 'wallet-connect',
        duration: 6000
      });
    } else if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
      toast.error('You rejected the connection request', {
        id: 'wallet-connect',
        duration: 4000
      });
    } else if (error.message?.includes('timeout')) {
      toast.error('Connection timed out. Please try again.', {
        id: 'wallet-connect',
        duration: 5000
      });
    } else if (error.message?.includes('WebSocket') || error.message?.includes('Failed to publish')) {
      console.log('🔄 Network issue detected, clearing sessions...');
      clearWalletConnectSessions();
      toast.error('Network connection failed. Check your internet and try again.', {
        id: 'wallet-connect',
        duration: 6000
      });
    } else if (error.message?.includes('Initialization failed')) {
      toast.error('Failed to initialize. Please refresh the page.', {
        id: 'wallet-connect',
        duration: 5000
      });
    } else {
      toast.error(`Connection error: ${error.message}`, {
        id: 'wallet-connect',
        duration: 5000
      });
    }

    console.log('💡 Troubleshooting tips:');
    console.log('   1. Make sure HashPack extension is installed and unlocked');
    console.log('   2. Try refreshing the page');
    console.log('   3. Clear browser cache and localStorage');
    console.log('   4. Check internet connection');
    console.log('   5. See WALLET_CONNECTION_TROUBLESHOOTING.md for more help');

    throw error;
  }
};

// HashPack Wallet Implementation using DAppConnector
class HashPackWallet {
  isConnected() {
    const connector = getDAppConnector();
    return connector && connector.signers && connector.signers.length > 0;
  }

  getSigner() {
    const connector = getDAppConnector();
    if (!connector || connector.signers.length === 0) {
      throw new Error('No HashPack signers found! Please connect your wallet.');
    }
    return connector.signers[0];
  }

  getAccountId() {
    return AccountId.fromString(this.getSigner().getAccountId().toString());
  }

  async transferHBAR(toAddress, amount, memo = '') {
    try {
      console.log('💸 Transferring HBAR:', {
        to: toAddress,
        amount,
        memo,
        fromAccount: this.getAccountId().toString()
      });

      const connector = getDAppConnector();
      console.log('🔍 Connector state:', {
        hasConnector: !!connector,
        signersCount: connector?.signers?.length || 0,
        accountId: connector?.signers?.[0]?.getAccountId()?.toString()
      });

      const transfer = new TransferTransaction()
        .addHbarTransfer(this.getAccountId(), new Hbar(-amount))
        .addHbarTransfer(typeof toAddress === 'string' ? AccountId.fromString(toAddress) : toAddress, new Hbar(amount))
        .setTransactionValidDuration(180); // 3 minutes valid duration

      if (memo) {
        transfer.setTransactionMemo(memo);
      }

      const signer = this.getSigner();

      console.log('⏳ Freezing transaction with signer...');
      console.log('   Signer type:', signer.constructor.name);

      // Focus the window to ensure popup appears
      if (typeof window !== 'undefined') {
        window.focus();
      }

      await transfer.freezeWithSigner(signer);

      console.log('📝 Executing transaction - APPROVE IN HASHPACK NOW!');
      console.log('   ⚠️ IMPORTANT: Look for HashPack popup/notification!');
      console.log('   If you don\'t see it, click the HashPack extension icon in your browser toolbar');

      // Show alert to user to check HashPack
      if (typeof window !== 'undefined') {
        // Create a visible notification overlay
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px 30px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          z-index: 10000;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 600;
          animation: slideDown 0.3s ease-out;
        `;
        notification.innerHTML = '🔔 Please approve the transaction in your HashPack wallet';
        document.body.appendChild(notification);

        // Add timeout to prevent hanging (3 minutes to match transaction valid duration)
        const txResult = await Promise.race([
          transfer.executeWithSigner(signer),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('HBAR transfer timed out after 3 minutes. Please check your HashPack wallet.')), 180000)
          )
        ]).finally(() => {
          // Remove notification
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        });

        console.log('✅ HBAR transfer successful:', txResult.transactionId.toString());
        return txResult;
      } else {
        // No window (server-side), just execute
        const txResult = await Promise.race([
          transfer.executeWithSigner(signer),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('HBAR transfer timed out after 3 minutes.')), 180000)
          )
        ]);

        console.log('✅ HBAR transfer successful:', txResult.transactionId.toString());
        return txResult;
      }
    } catch (error) {
      console.error('❌ HBAR transfer error:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Provide user-friendly error messages
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        throw new Error('Transaction timed out. Please make sure:\n1. HashPack extension is installed and unlocked\n2. You clicked "Approve" in the HashPack popup\n3. Try clicking the HashPack extension icon manually');
      } else if (error.message?.includes('rejected') || error.message?.includes('User rejected')) {
        throw new Error('Transaction rejected in HashPack wallet.');
      } else if (error.message?.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
        throw new Error('Insufficient HBAR balance in your wallet.');
      }

      throw error;
    }
  }

  async transferFungibleToken(toAddress, tokenId, amount) {
    const transferTokenTransaction = new TransferTransaction()
      .addTokenTransfer(tokenId, this.getAccountId(), -amount)
      .addTokenTransfer(tokenId, toAddress.toString(), amount);

    const signer = this.getSigner();
    await transferTokenTransaction.freezeWithSigner(signer);
    const txResult = await transferTokenTransaction.executeWithSigner(signer);
    return txResult ? txResult.transactionId : null;
  }

  async transferNFT(sellerAccountId, tokenId, serialNumber, price) {
    const buyerAccountId = this.getAccountId();

    console.log('🔄 transferNFT called with:', {
      sellerAccountId: sellerAccountId.toString(),
      tokenId: tokenId.toString(),
      serialNumber,
      price,
      priceType: typeof price,
      priceToString: price.toString(),
      priceToTinybars: price.toTinybars ? price.toTinybars().toString() : 'N/A'
    });

    // Use negated() method for proper negation of Hbar
    const negativePrice = price.negated();

    // Create transfer using approved allowance
    // This allows buyer to complete the transaction without seller's signature
    const transferTransaction = new TransferTransaction()
      // Buyer pays HBAR to seller
      .addHbarTransfer(buyerAccountId, negativePrice)
      .addHbarTransfer(sellerAccountId, price)
      // Transfer NFT using approved allowance (sender is seller, receiver is buyer)
      .addApprovedNftTransfer(tokenId, serialNumber, sellerAccountId, buyerAccountId);

    const signer = this.getSigner();
    await transferTransaction.freezeWithSigner(signer);
    const txResult = await transferTransaction.executeWithSigner(signer);

    console.log('✅ Transfer completed:', txResult.transactionId.toString());
    return txResult ? txResult.transactionId : null;
  }

  async approveNFTAllowance(tokenId, serialNumber, spenderAccountId = null) {
    try {
      const ownerAccountId = this.getAccountId();
      // If no spender specified, approve to self (for marketplace delegation)
      const spender = spenderAccountId
        ? (typeof spenderAccountId === 'string' ? AccountId.fromString(spenderAccountId) : spenderAccountId)
        : ownerAccountId;

      console.log('🔐 Approving NFT allowance:', {
        tokenId: tokenId.toString(),
        serialNumber,
        owner: ownerAccountId.toString(),
        spender: spender.toString()
      });

      // Create NftId from tokenId and serialNumber
      const nftId = new NftId(tokenId, serialNumber);

      const approvalTx = new AccountAllowanceApproveTransaction()
        .approveTokenNftAllowance(nftId, ownerAccountId, spender)
        .setTransactionValidDuration(180); // 3 minutes valid duration

      const signer = this.getSigner();

      console.log('⏳ Freezing NFT approval transaction...');
      await approvalTx.freezeWithSigner(signer);

      console.log('📝 Requesting approval signature from HashPack...');
      console.log('   Please approve the NFT allowance in your HashPack wallet');

      // Add timeout to prevent hanging (3 minutes)
      const result = await Promise.race([
        approvalTx.executeWithSigner(signer),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('NFT approval timed out after 3 minutes. Please check your HashPack wallet.')), 180000)
        )
      ]);

      console.log('✅ NFT allowance approved:', result.transactionId.toString());
      return result.transactionId;
    } catch (error) {
      console.error('❌ NFT approval failed:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack
      });

      // Provide user-friendly error messages
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        throw new Error('NFT approval timed out. Please make sure HashPack is unlocked and try again.');
      } else if (error.message?.includes('rejected')) {
        throw new Error('NFT approval rejected in HashPack.');
      }

      throw error;
    }
  }

  async associateToken(tokenId) {
    try {
      console.log('🔗 Associating token:', tokenId.toString());

      const associateTokenTransaction = new TokenAssociateTransaction()
        .setAccountId(this.getAccountId())
        .setTokenIds([tokenId]);

      const signer = this.getSigner();

      console.log('⏳ Freezing transaction...');
      await associateTokenTransaction.freezeWithSigner(signer);

      console.log('📝 Requesting signature from HashPack...');
      // Add timeout to prevent hanging
      const txResult = await Promise.race([
        associateTokenTransaction.executeWithSigner(signer),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Token association timed out after 60 seconds')), 60000)
        )
      ]);

      console.log('✅ Token associated successfully!');
      return txResult ? txResult.transactionId : null;
    } catch (error) {
      console.error('❌ Token association error:', error);

      // Check if token is already associated
      if (error.message?.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT') ||
          error.message?.includes('already associated')) {
        console.log('ℹ️ Token already associated, continuing...');
        return null; // Not an error, token is already associated
      }

      throw error;
    }
  }

  async executeContractFunction(
    contractId,
    functionName,
    functionParameters,
    gasLimit
  ) {
    const tx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(gasLimit)
      .setFunction(functionName, functionParameters.buildHAPIParams());

    const signer = this.getSigner();
    await tx.freezeWithSigner(signer);
    const txResult = await tx.executeWithSigner(signer);

    return txResult ? txResult.transactionId : null;
  }

  disconnect() {
    const connector = getDAppConnector();
    if (connector) {
      connector.disconnectAll().then(() => {
        refreshEvent.emit("sync");
      });
    }
  }
}

export const hashPackWallet = new HashPackWallet();

// Track if auto-login is in progress to prevent duplicate calls
let autoLoginInProgress = false;

// Auto-login with wallet
const autoLoginWithWallet = async (accountId) => {
  try {
    // Check if already logged in
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      console.log('✅ Already logged in with token');
      return true;
    }

    // Prevent duplicate auto-login calls
    if (autoLoginInProgress) {
      console.log('⏳ Auto-login already in progress...');
      return false;
    }

    autoLoginInProgress = true;
    console.log('🔐 Auto-logging in with wallet:', accountId);
    toast.loading('Logging in with wallet...', { id: 'wallet-login' });

    const response = await axios.post(`${API_BASE}/auth/wallet-login`, {
      accountId: accountId
    });

    if (response.data.success) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('refreshToken', response.data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      console.log('✅ Logged in successfully:', response.data.data.user);
      toast.success('Logged in! ✅', { id: 'wallet-login' });
      autoLoginInProgress = false;
      return true;
    } else {
      autoLoginInProgress = false;
      return false;
    }
  } catch (error) {
    console.error('❌ Auto-login failed:', error);
    toast.error('Failed to login with wallet', { id: 'wallet-login' });
    autoLoginInProgress = false;
    return false;
  }
};

// React component that syncs HashPack connection state with context
export const HashPackClient = () => {
  const { setAccountId, setIsConnected } = useContext(WalletConnectContext);

  const syncWithHashPackContext = useCallback(async () => {
    const connector = getDAppConnector();
    if (connector && connector.signers.length > 0) {
      const accountId = connector.signers[0]?.getAccountId()?.toString();
      if (accountId) {
        setAccountId(accountId);
        setIsConnected(true);
        console.log('✅ HashPack connected:', accountId);
        // Auto-login with wallet
        await autoLoginWithWallet(accountId);
      } else {
        setAccountId('');
        setIsConnected(false);
        // Clear auth tokens on disconnect
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        console.log('🔓 Wallet disconnected, cleared auth tokens');
      }
    } else {
      setAccountId('');
      setIsConnected(false);
      // Clear auth tokens on disconnect
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      console.log('🔓 Wallet disconnected, cleared auth tokens');
    }
  }, [setAccountId, setIsConnected]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isSubscribed = true;

    // Sync after WalletConnect finishes initializing
    const handleSync = () => {
      if (isSubscribed) {
        syncWithHashPackContext();
      }
    };

    refreshEvent.addListener("sync", handleSync);

    initializeWalletConnect()
      .then(() => {
        if (isSubscribed) {
          syncWithHashPackContext();
        }
      })
      .catch((error) => {
        console.error('Failed to initialize WalletConnect:', error);
        // Auto-clear on init failure
        if (error.message?.includes('WebSocket') || error.message?.includes('timeout')) {
          console.log('🔄 Auto-clearing stale sessions...');
          clearWalletConnectSessions();
        }
      });

    return () => {
      isSubscribed = false;
      refreshEvent.removeListener("sync", handleSync);
    };
  }, [syncWithHashPackContext]);

  return null;
};
