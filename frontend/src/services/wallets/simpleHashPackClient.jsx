import { HashConnect } from 'hashconnect';
import {
  AccountId,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  Hbar,
  LedgerId
} from '@hashgraph/sdk';
import toast from 'react-hot-toast';

// Simple HashPack wallet using HashConnect
class SimpleHashPackWallet {
  constructor() {
    this.hashconnect = null;
    this.topic = '';
    this.pairingString = '';
    this.pairingData = null;
    this.accountId = null;
    this.network = 'testnet';
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    console.log('🔵 Initializing HashConnect...');

    this.hashconnect = new HashConnect(
      LedgerId.TESTNET,
      process.env.VITE_WALLETCONNECT_PROJECT_ID || '377d75bb6f86a2ffd427d032ff6ea7d3',
      {
        name: 'ComicPad',
        description: 'Decentralized comic book publishing',
        icons: [window.location.origin + '/logo.png']
      },
      true // debug mode
    );

    this.initialized = true;
    console.log('✅ HashConnect initialized');
  }

  async connect() {
    try {
      await this.init();

      console.log('🔵 Initiating pairing...');
      toast.loading('Opening HashPack...', { id: 'wallet' });

      // Initialize connection
      await this.hashconnect.init();

      // Get pairing data
      const initData = await this.hashconnect.connect();
      console.log('✅ Init data received:', initData);

      this.topic = initData.topic;
      this.pairingString = initData.pairingString;

      console.log('🔗 Pairing string:', this.pairingString);
      console.log('📋 Opening HashPack...');

      // Open HashPack extension or show pairing string
      this.hashconnect.connectToLocalWallet(this.pairingString);

      // Wait for pairing event
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          toast.error('Connection timeout. Please try again.', { id: 'wallet' });
          reject(new Error('Connection timeout'));
        }, 60000); // 60 second timeout

        this.hashconnect.pairingEvent.once((pairingData) => {
          clearTimeout(timeout);
          console.log('✅ Paired with wallet!', pairingData);

          this.pairingData = pairingData;
          this.accountId = pairingData.accountIds[0];

          toast.success(`Connected: ${this.accountId}`, { id: 'wallet' });

          // Save pairing data
          localStorage.setItem('hashconnect-pairing', JSON.stringify({
            topic: this.topic,
            pairingData: this.pairingData,
            accountId: this.accountId
          }));

          resolve({
            accountId: this.accountId,
            network: this.network
          });
        });
      });

    } catch (error) {
      console.error('❌ Failed to connect:', error);
      toast.error('Failed to connect wallet', { id: 'wallet' });
      throw error;
    }
  }

  async reconnect() {
    try {
      const saved = localStorage.getItem('hashconnect-pairing');
      if (!saved) return false;

      const { topic, pairingData, accountId } = JSON.parse(saved);

      await this.init();
      await this.hashconnect.init();

      this.topic = topic;
      this.pairingData = pairingData;
      this.accountId = accountId;

      console.log('✅ Reconnected to saved session:', accountId);
      return true;
    } catch (error) {
      console.error('Failed to reconnect:', error);
      localStorage.removeItem('hashconnect-pairing');
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.hashconnect && this.topic) {
        await this.hashconnect.disconnect(this.topic);
      }

      this.topic = '';
      this.pairingData = null;
      this.accountId = null;

      localStorage.removeItem('hashconnect-pairing');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      toast.success('Wallet disconnected', { id: 'wallet' });
      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  isConnected() {
    return !!this.accountId && !!this.pairingData;
  }

  getAccountId() {
    if (!this.accountId) {
      throw new Error('Wallet not connected');
    }
    return AccountId.fromString(this.accountId);
  }

  async signAndExecuteTransaction(transaction) {
    if (!this.isConnected()) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('📝 Requesting signature from HashPack...');
      toast.loading('Please sign the transaction in HashPack', { id: 'sign' });

      // Convert transaction to bytes
      const transactionBytes = transaction.toBytes();

      // Send to HashPack for signing
      const response = await this.hashconnect.sendTransaction(
        this.topic,
        {
          topic: this.topic,
          byteArray: transactionBytes,
          metadata: {
            accountToSign: this.accountId,
            returnTransaction: false
          }
        }
      );

      console.log('✅ Transaction response:', response);
      toast.success('Transaction signed!', { id: 'sign' });

      return response;
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      toast.error('Transaction failed or rejected', { id: 'sign' });
      throw error;
    }
  }
}

// Export singleton instance
export const simpleHashPackWallet = new SimpleHashPackWallet();

// Export helper function to open connection
export async function connectSimpleHashPack() {
  return await simpleHashPackWallet.connect();
}

// Export helper to check and reconnect
export async function checkAndReconnectHashPack() {
  return await simpleHashPackWallet.reconnect();
}

export default simpleHashPackWallet;
