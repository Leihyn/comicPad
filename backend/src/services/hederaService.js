// backend/src/services/hederaService.js
import {
  Client,
  AccountId,
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  TokenId,
  Hbar,
  CustomRoyaltyFee,
  CustomFixedFee,
  AccountBalanceQuery,
  TokenNftInfoQuery,
  NftId
} from '@hashgraph/sdk';
import logger from '../utils/logger.js';

/**
 * Hedera Service for HTS (Hedera Token Service) operations
 */
class HederaService {
  constructor() {
    this.client = null;
    this.operatorId = null;
    this.operatorKey = null;
    this.network = process.env.HEDERA_NETWORK || 'testnet';
    this.initAttempted = false;
    // DON'T call initialize() here anymore
  }

  /**
   * Initialize Hedera client (called lazily on first use)
   */
  initialize() {
    // Only attempt initialization once
    if (this.initAttempted) {
      return;
    }
    
    this.initAttempted = true;

    try {
      if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
        logger.warn('Hedera credentials not configured. NFT minting will be disabled.');
        return;
      }

      this.operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
      this.operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY);

      // Create client
      if (this.network === 'mainnet') {
        this.client = Client.forMainnet();
      } else {
        this.client = Client.forTestnet();
      }

      this.client.setOperator(this.operatorId, this.operatorKey);

      logger.info(`Hedera Service initialized for ${this.network}`);
    } catch (error) {
      logger.error('Failed to initialize Hedera service:', error);
      this.client = null;
    }
  }

  /**
   * Check if service is initialized (and initialize if needed)
   */
  checkInitialized() {
    // Initialize on first use
    if (!this.initAttempted) {
      this.initialize();
    }

    if (!this.client) {
      throw new Error('Hedera service not initialized. Check your credentials.');
    }
  }

  /**
   * Create NFT collection (token)
   */
  async createCollection(options) {
    this.checkInitialized();

    const {
      name,
      symbol,
      creatorAccountId,
      royaltyPercentage = 10,
      maxSupply = 0
    } = options;

    try {
      logger.info(`Creating NFT collection: ${name} (${symbol})`);

      const creatorAccount = AccountId.fromString(creatorAccountId);

      // Create custom royalty fee
      const royaltyFee = new CustomRoyaltyFee()
        .setNumerator(royaltyPercentage)
        .setDenominator(100)
        .setFeeCollectorAccountId(creatorAccount)
        .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(1)));

      // Create token transaction
      const transaction = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(creatorAccount)
        .setSupplyType(maxSupply > 0 ? TokenSupplyType.Finite : TokenSupplyType.Infinite)
        .setMaxSupply(maxSupply)
        .setSupplyKey(this.operatorKey)
        .setCustomFees([royaltyFee])
        .setAdminKey(this.operatorKey)
        .setFreezeDefault(false);

      // Execute transaction
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      const tokenId = receipt.tokenId.toString();

      logger.info(`NFT collection created: ${tokenId}`);

      return {
        tokenId,
        supplyKey: this.operatorKey.toString(),
        transactionId: txResponse.transactionId.toString(),
        explorerUrl: this.getExplorerUrl('token', tokenId)
      };
    } catch (error) {
      logger.error('Failed to create NFT collection:', error);
      throw new Error(`Failed to create collection: ${error.message}`);
    }
  }

  /**
   * Mint NFTs
   */
  async mintNFTs(options) {
    this.checkInitialized();

    const {
      tokenId,
      metadata,
      quantity = 1
    } = options;

    try {
      logger.info(`Minting ${quantity} NFT(s) for token ${tokenId}`);

      const token = TokenId.fromString(tokenId);

      // Prepare metadata (CID from IPFS)
      const metadataBytes = Buffer.from(metadata);
      const metadataArray = Array(quantity).fill(metadataBytes);

      // Mint transaction
      const transaction = new TokenMintTransaction()
        .setTokenId(token)
        .setMetadata(metadataArray)
        .freezeWith(this.client);

      // Sign and execute
      const signedTx = await transaction.sign(this.operatorKey);
      const txResponse = await signedTx.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      const serialNumbers = receipt.serials.map(s => s.toNumber());

      logger.info(`Minted NFTs with serial numbers: ${serialNumbers.join(', ')}`);

      return {
        serialNumbers,
        transactionId: txResponse.transactionId.toString(),
        explorerUrl: this.getExplorerUrl('transaction', txResponse.transactionId.toString())
      };
    } catch (error) {
      logger.error('Failed to mint NFTs:', error);
      throw new Error(`Failed to mint NFTs: ${error.message}`);
    }
  }

  /**
   * Transfer NFT
   */
  async transferNFT(options) {
    this.checkInitialized();

    const {
      tokenId,
      serialNumber,
      fromAccountId,
      toAccountId,
      price
    } = options;

    try {
      logger.info(`Transferring NFT ${tokenId}/${serialNumber} from ${fromAccountId} to ${toAccountId}`);

      const token = TokenId.fromString(tokenId);
      const nftId = new NftId(token, serialNumber);
      const sender = AccountId.fromString(fromAccountId);
      const receiver = AccountId.fromString(toAccountId);

      // Create transfer transaction
      const transaction = new TransferTransaction()
        .addNftTransfer(nftId, sender, receiver);

      // Add HBAR payment if price specified
      if (price && price > 0) {
        transaction
          .addHbarTransfer(receiver, new Hbar(-price))
          .addHbarTransfer(sender, new Hbar(price));
      }

      // Execute transaction
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      logger.info(`NFT transferred successfully: ${txResponse.transactionId.toString()}`);

      return {
        transactionId: txResponse.transactionId.toString(),
        status: receipt.status.toString(),
        explorerUrl: this.getExplorerUrl('transaction', txResponse.transactionId.toString())
      };
    } catch (error) {
      logger.error('Failed to transfer NFT:', error);
      throw new Error(`Failed to transfer NFT: ${error.message}`);
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId) {
    this.checkInitialized();

    try {
      const account = AccountId.fromString(accountId);
      const query = new AccountBalanceQuery().setAccountId(account);
      const balance = await query.execute(this.client);

      return {
        hbar: balance.hbars.toBigNumber().toString(),
        tokens: balance.tokens.toString()
      };
    } catch (error) {
      logger.error('Failed to get account balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Get NFT info
   */
  async getNFTInfo(tokenId, serialNumber) {
    this.checkInitialized();

    try {
      const token = TokenId.fromString(tokenId);
      const nftId = new NftId(token, serialNumber);
      const query = new TokenNftInfoQuery().setNftId(nftId);
      const info = await query.execute(this.client);

      return {
        tokenId: info.nftId.tokenId.toString(),
        serialNumber: info.nftId.serial.toNumber(),
        accountId: info.accountId.toString(),
        metadata: info.metadata.toString(),
        createdAt: info.creationTime.toDate()
      };
    } catch (error) {
      logger.error('Failed to get NFT info:', error);
      throw new Error(`Failed to get NFT info: ${error.message}`);
    }
  }

  /**
   * Verify NFT ownership
   */
  async verifyOwnership(accountId, tokenId, serialNumber) {
    try {
      const info = await this.getNFTInfo(tokenId, serialNumber);
      return info.accountId === accountId;
    } catch (error) {
      logger.error('Failed to verify ownership:', error);
      return false;
    }
  }

  /**
   * Get explorer URL
   */
  getExplorerUrl(type, id) {
    const baseUrl = this.network === 'mainnet'
      ? 'https://hashscan.io/mainnet'
      : 'https://hashscan.io/testnet';

    return `${baseUrl}/${type}/${id}`;
  }

  /**
   * Format account ID
   */
  formatAccountId(accountId) {
    try {
      return AccountId.fromString(accountId).toString();
    } catch (error) {
      return accountId;
    }
  }

  /**
   * Validate account ID
   */
  isValidAccountId(accountId) {
    try {
      AccountId.fromString(accountId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert HBAR to tinybars
   */
  hbarToTinybar(hbar) {
    return new Hbar(hbar).toTinybars().toNumber();
  }

  /**
   * Convert tinybars to HBAR
   */
  tinybarToHbar(tinybar) {
    return Hbar.fromTinybars(tinybar).toBigNumber().toNumber();
  }
}

// Export single instance
const hederaService = new HederaService();
export default hederaService;