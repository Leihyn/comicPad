// backend/src/services/hederaService.js
import {
  Client,
  AccountId,
  PrivateKey,
  PublicKey,
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
   * Fetch account public key from Hedera Mirror Node
   */
  async getAccountPublicKey(accountId) {
    try {
      const network = this.network === 'mainnet' ? 'mainnet-public' : 'testnet';
      const response = await fetch(
        `https://${network}.mirrornode.hedera.com/api/v1/accounts/${accountId}`
      );
      const data = await response.json();

      if (!data.key || !data.key.key) {
        throw new Error('Could not retrieve account public key');
      }

      // The key is returned as a hex string
      const publicKey = PublicKey.fromString(data.key.key);
      logger.info(`Retrieved public key for ${accountId}`);
      return publicKey;
    } catch (error) {
      logger.error(`Failed to fetch account public key for ${accountId}:`, error);
      throw new Error(`Failed to get account key: ${error.message}`);
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
      maxSupply = 0,
      creatorPublicKey // Optional: user's public key (not used for supply key)
    } = options;

    try {
      logger.info(`Creating NFT collection: ${name} (${symbol})`);

      const creatorAccount = AccountId.fromString(creatorAccountId);

      // IMPORTANT: Use operator's key as supply key so the backend can mint
      // The operator will mint NFTs on behalf of creators
      // Royalties still go to the creator via CustomRoyaltyFee
      const supplyKey = this.operatorKey.publicKey;
      logger.info('Using operator public key as supply key for backend minting');

      // Create custom royalty fee - creator gets royalties on secondary sales
      const royaltyFee = new CustomRoyaltyFee()
        .setNumerator(royaltyPercentage)
        .setDenominator(100)
        .setFeeCollectorAccountId(creatorAccount) // Creator receives royalties
        .setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(1)));

      // Create token transaction
      // Treasury: operator account (holds initial NFTs)
      // Supply key: operator's key (allows backend to mint)
      // Royalties: go to creator via royaltyFee
      const transaction = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(this.operatorId) // Operator as treasury
        .setSupplyType(maxSupply > 0 ? TokenSupplyType.Finite : TokenSupplyType.Infinite)
        .setMaxSupply(maxSupply)
        .setSupplyKey(supplyKey) // Operator's public key so backend can mint
        .setCustomFees([royaltyFee])
        .setAdminKey(this.operatorKey)
        .setFreezeDefault(false);

      // Execute transaction
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      const tokenId = receipt.tokenId.toString();

      logger.info(`NFT collection created: ${tokenId}`);
      logger.info(`Treasury and supply key: operator (${this.operatorId.toString()})`);
      logger.info(`Royalty collector: creator (${creatorAccountId})`);

      return {
        tokenId,
        treasuryAccountId: this.operatorId.toString(),
        creatorAccountId: creatorAccountId, // Original creator for royalties
        supplyKey: supplyKey.toString(), // Operator's public key
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
      logger.info(`Transferring NFT ${tokenId}/${serialNumber} from ${fromAccountId} to ${toAccountId} using operator allowance`);
      logger.info(`Marketplace operator ID: ${this.operatorId.toString()}`);

      const token = TokenId.fromString(tokenId);
      const sender = AccountId.fromString(fromAccountId);
      const receiver = AccountId.fromString(toAccountId);

      logger.info(`Parsed accounts - Sender: ${sender.toString()}, Receiver: ${receiver.toString()}, Token: ${token.toString()}`);

      // Create transfer transaction using APPROVED transfer
      // The operator (marketplace) was pre-approved by seller when listing
      // Only the operator needs to sign this transaction
      const transaction = new TransferTransaction()
        .addApprovedNftTransfer(token, serialNumber, sender, receiver)
        .setTransactionValidDuration(180); // 3 minutes valid duration

      logger.info('Transaction created with approved NFT transfer');

      // NOTE: We're NOT adding HBAR payment in the same transaction
      // because that would require buyer's signature which we don't have on backend
      // In production, you'd want to:
      // 1. Have buyer send payment transaction first
      // 2. Verify payment on-chain
      // 3. Then transfer NFT using operator allowance
      // OR use an escrow smart contract

      logger.info('Freezing and executing approved NFT transfer...');

      // Freeze and execute the transaction with the client
      // The client is already configured with the operator account and key
      // so it will automatically sign with the operator's signature
      const txResponse = await transaction.freezeWith(this.client).execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      logger.info(`NFT transferred successfully using allowance: ${txResponse.transactionId.toString()}`);

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