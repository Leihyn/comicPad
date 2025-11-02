import { useCallback, useContext, useEffect } from 'react';
import {
  AccountId,
  ContractExecuteTransaction,
  ContractId,
  LedgerId,
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
    console.log('🔵 Step 1: Clearing expired proposals...');
    clearExpiredProposals();

    console.log('🔵 Step 2: Initializing WalletConnect...');
    toast.loading('Initializing wallet connection...', { id: 'wallet-connect' });

    await initializeWalletConnect();
    console.log('✅ Step 3: WalletConnect initialized');

    const connector = getDAppConnector();
    if (!connector) {
      console.error('❌ Connector not available after init');
      throw new Error('WalletConnect connector not available');
    }

    // Check if already connected
    if (connector.signers && connector.signers.length > 0) {
      console.log('✅ Already connected to wallet');
      toast.success('Wallet already connected!', { id: 'wallet-connect' });
      refreshEvent.emit("sync");
      return;
    }

    console.log('✅ Step 4: Connector ready, opening modal...');

    // Check if HashPack extension is available
    const hasExtension = isHashPackExtensionAvailable();
    console.log('🔍 HashPack extension available:', hasExtension);

    // If extension is available, try direct connection first
    if (hasExtension) {
      try {
        console.log('🔵 Trying direct extension connection...');
        toast.loading('Connecting to HashPack extension...', { id: 'wallet-connect' });

        if (typeof connector.connectExtension === 'function') {
          const session = await connector.connectExtension('hashpack');
          console.log('✅ Connected via extension!');
          toast.success('Wallet connected!', { id: 'wallet-connect' });
          refreshEvent.emit("sync");
          return session;
        }
      } catch (extError) {
        console.warn('Extension connection failed, falling back to modal:', extError);
      }
    }

    // Fallback to modal method
    toast.loading('Opening wallet connection modal...', { id: 'wallet-connect' });

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
      console.log('🔵 Calling connector.openModal()...');
      console.log('⏳ Waiting for user to connect wallet in modal...');

      const session = await connector.openModal(undefined, false);
      console.log('✅ Session established:', session);

      toast.success('Wallet connected successfully!', { id: 'wallet-connect' });
      refreshEvent.emit("sync");
      return session;
    } finally {
      console.error = originalError;
    }
  } catch (error) {
    console.error('❌ Failed to connect wallet:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Handle specific error types
    if (error.message?.includes('Proposal expired')) {
      console.log('🔄 Clearing expired sessions...');
      clearWalletConnectSessions();
      toast.error('Connection expired. Please try again.', {
        id: 'wallet-connect',
        duration: 5000
      });
    } else if (error.message?.includes('User rejected')) {
      toast.error('Connection rejected', { id: 'wallet-connect' });
    } else if (error.message?.includes('WebSocket') || error.message?.includes('Failed to publish') || error.message?.includes('timeout')) {
      console.log('🔄 Network issue detected...');
      clearWalletConnectSessions();
      toast.error('Connection failed. Please try again.', {
        id: 'wallet-connect',
        duration: 5000
      });
    } else {
      toast.error(`Connection error: ${error.message}`, {
        id: 'wallet-connect',
        duration: 5000
      });
    }
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

  async transferHBAR(toAddress, amount) {
    const transferHBARTransaction = new TransferTransaction()
      .addHbarTransfer(this.getAccountId(), -amount)
      .addHbarTransfer(toAddress, amount);

    const signer = this.getSigner();
    await transferHBARTransaction.freezeWithSigner(signer);
    const txResult = await transferHBARTransaction.executeWithSigner(signer);
    return txResult ? txResult.transactionId : null;
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

    const transferTransaction = new TransferTransaction()
      // Buyer pays HBAR to seller
      .addHbarTransfer(buyerAccountId, -price)
      .addHbarTransfer(sellerAccountId, price)
      // Seller sends NFT to buyer
      .addNftTransfer(tokenId, serialNumber, sellerAccountId, buyerAccountId);

    const signer = this.getSigner();
    await transferTransaction.freezeWithSigner(signer);
    const txResult = await transferTransaction.executeWithSigner(signer);
    return txResult ? txResult.transactionId : null;
  }

  async associateToken(tokenId) {
    const associateTokenTransaction = new TokenAssociateTransaction()
      .setAccountId(this.getAccountId())
      .setTokenIds([tokenId]);

    const signer = this.getSigner();
    await associateTokenTransaction.freezeWithSigner(signer);
    const txResult = await associateTokenTransaction.executeWithSigner(signer);
    return txResult ? txResult.transactionId : null;
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
