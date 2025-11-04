import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  Hbar,
  PublicKey
} from '@hashgraph/sdk';
import { hashPackWallet } from './wallets/hashpackClient';

/**
 * Fetch account public key from Hedera Mirror Node
 * @param {string} accountId - Hedera account ID
 * @returns {Promise<PublicKey>} - Account's public key
 */
async function getAccountPublicKey(accountId) {
  try {
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
    );
    const data = await response.json();

    if (!data.key || !data.key.key) {
      throw new Error('Could not retrieve account public key');
    }

    // The key is returned as a hex string
    const publicKey = PublicKey.fromString(data.key.key);
    console.log('🔑 Retrieved public key:', publicKey.toString());
    return publicKey;
  } catch (error) {
    console.error('Failed to fetch account public key:', error);
    throw new Error(`Failed to get account key: ${error.message}`);
  }
}

/**
 * Create an NFT collection on Hedera
 * @param {Object} collectionData - Collection metadata
 * @returns {Promise<Object>} - Result with tokenId
 */
export async function createNFTCollection(collectionData) {
  const { name, symbol, royaltyPercentage } = collectionData;

  try {
    console.log('🎨 Creating NFT collection:', { name, symbol, royaltyPercentage });

    // Get the signer and account from HashPack
    const signer = hashPackWallet.getSigner();
    const treasuryAccount = hashPackWallet.getAccountId();
    console.log('💰 Treasury account:', treasuryAccount.toString());

    // Get the user's public key to use as supply key
    console.log('🔑 Getting account public key...');
    const publicKey = await getAccountPublicKey(treasuryAccount.toString());
    console.log('✅ Public key retrieved:', publicKey.toString());

    // Wrap the signing and execution with retry logic for WalletConnect relay errors
    const result = await retryWithBackoff(async () => {
      // Create the token creation transaction WITH supply key
      // Create FRESH transaction for each retry attempt
      console.log('🔧 Creating fresh token transaction...');
      const tokenCreateTx = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyType(TokenSupplyType.Infinite)
        .setTreasuryAccountId(treasuryAccount)
        .setSupplyKey(publicKey) // Set the user's public key as supply key
        .setMaxTransactionFee(new Hbar(20)); // Increased fee for token creation

      console.log('🔧 Freezing transaction for signing...');

      // Freeze the transaction for signing
      const frozenTx = await tokenCreateTx.freezeWithSigner(signer);

      console.log('✍️ Requesting signature from HashPack...');
      console.log('👉 Please check for HashPack popup and approve the transaction!');

      // Show user notification
      if (window.toast) {
        window.toast.loading(
          '👉 Please approve the transaction in HashPack wallet...',
          { id: 'collection-create' }
        );
      }

      // Execute with signer (this will prompt for signature and execute)
      const txResponse = await frozenTx.executeWithSigner(signer);

      console.log('⏳ Waiting for receipt...');

      // Get the receipt using signer
      const receipt = await txResponse.getReceiptWithSigner(signer);

      // Get the token ID
      const tokenId = receipt.tokenId;

      if (!tokenId) {
        throw new Error('Failed to get token ID from receipt');
      }

      console.log('✅ Collection created! Token ID:', tokenId.toString());

      return {
        tokenId: tokenId.toString(),
        transactionId: txResponse.transactionId.toString(),
        status: receipt.status.toString()
      };
    }, 3, 3000); // 3 retries, 3 second initial delay

    return result;

  } catch (error) {
    console.error('❌ Failed to create NFT collection:', error);

    // Provide more helpful error messages
    let errorMessage = error.message;

    if (error.message?.includes('INVALID_SIGNATURE')) {
      errorMessage = 'Transaction signature invalid. Please ensure your wallet is properly connected.';
    } else if (error.message?.includes('INSUFFICIENT_TX_FEE')) {
      errorMessage = 'Insufficient transaction fee. Please ensure your account has enough HBAR.';
    } else if (error.message?.includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
      errorMessage = 'Insufficient account balance. Please add HBAR to your account.';
    } else if (error.message?.includes('Failed to publish payload') || error.message?.includes('tag:1108')) {
      errorMessage = 'WalletConnect connection issue. Please try again or reconnect your wallet.';
    }

    throw new Error(`Failed to create collection: ${errorMessage}`);
  }
}

/**
 * Add timeout to a promise
 * @param {Promise} promise - Promise to add timeout to
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} - Promise that rejects on timeout
 */
function promiseWithTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ]);
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Initial delay in milliseconds
 * @returns {Promise<any>} - Result from the function
 */
async function retryWithBackoff(fn, maxRetries = 3, delayMs = 2000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add 120 second timeout to allow time for user to sign in HashPack
      return await promiseWithTimeout(fn(), 120000);
    } catch (error) {
      lastError = error;
      const errorMessage = error.message?.toLowerCase() || '';
      const errorString = error.toString().toLowerCase();

      // Check if this is a WalletConnect relay error or timeout (intermittent)
      const isRelayError = errorMessage.includes('failed to publish payload') ||
                          errorMessage.includes('relay') ||
                          errorString.includes('tag:1108') ||
                          errorMessage.includes('websocket') ||
                          errorMessage.includes('timeout') ||
                          errorMessage.includes('timed out');

      if (isRelayError && attempt < maxRetries) {
        const waitTime = delayMs * attempt; // Exponential backoff
        console.log(`⚠️ WalletConnect relay error (attempt ${attempt}/${maxRetries})`);
        console.log(`⏳ Retrying in ${waitTime/1000} seconds...`);
        console.log('Error:', error.message);

        if (window.toast) {
          window.toast.loading(
            `Connection issue detected. Retrying... (attempt ${attempt}/${maxRetries})`,
            { id: 'mint' }
          );
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // If not a relay error or out of retries, throw
      console.log('❌ Error is not retryable or max retries reached');
      throw error;
    }
  }

  throw lastError;
}

/**
 * Mint NFTs to a collection (mints ONE AT A TIME to avoid HashPack payload limits)
 * @param {string} tokenId - The collection token ID
 * @param {Array<string>} metadataURIs - Array of IPFS URIs for each NFT
 * @returns {Promise<Object>} - Result with serial numbers
 */
export async function mintNFTs(tokenId, metadataURIs) {
  try {
    console.log('🎨 Minting NFTs to collection:', tokenId);
    console.log('📦 Total NFTs to mint:', metadataURIs.length);

    // Verify HashPack is connected
    if (!hashPackWallet.isConnected()) {
      throw new Error('HashPack wallet not connected. Please connect your wallet first.');
    }

    const allSerials = [];
    const allTransactionIds = [];

    // Get the signer from HashPack
    console.log('🔑 Getting signer from HashPack...');
    const signer = hashPackWallet.getSigner();

    if (!signer) {
      throw new Error('Failed to get signer from HashPack. Please reconnect your wallet.');
    }

    console.log('✅ Signer obtained successfully');

    // Extract just the IPFS CID (remove ipfs:// prefix if present)
    const extractCID = (uri) => {
      if (uri.startsWith('ipfs://')) {
        return uri.replace('ipfs://', '');
      }
      return uri;
    };

    // Mint ONE NFT at a time (HashPack has very strict payload limits)
    for (let i = 0; i < metadataURIs.length; i++) {
      const nftNumber = i + 1;
      const metadata = extractCID(metadataURIs[i]);

      console.log(`\n🔄 Minting NFT ${nftNumber}/${metadataURIs.length}...`);
      console.log('📝 Metadata:', metadata);

      // Show progress to user
      if (window.toast) {
        window.toast.loading(`Minting NFT ${nftNumber}/${metadataURIs.length}... (sign in wallet)`, { id: 'mint' });
      }

      // Convert metadata to bytes (use the actual IPFS CID)
      const encoder = new TextEncoder();
      const metadataBytes = encoder.encode(metadata);

      console.log('📊 Metadata byte length:', metadataBytes.length);

      // Mint with retry logic to handle intermittent WalletConnect relay errors
      let txResponse = null;
      let receipt = null;
      let mintAttempt = 0;
      const maxMintAttempts = 3;

      while (mintAttempt < maxMintAttempts) {
        mintAttempt++;
        try {
          // Create mint transaction for single NFT
          console.log(`🏗️ Building mint transaction (attempt ${mintAttempt}/${maxMintAttempts})...`);
          const mintTx = new TokenMintTransaction()
            .setTokenId(tokenId)
            .setMetadata([metadataBytes])
            .setMaxTransactionFee(new Hbar(10))
            .setTransactionValidDuration(180); // 3 minutes validity

          console.log('✅ Transaction built successfully');
          console.log('🔧 Freezing transaction with signer...');

          const frozenTx = await mintTx.freezeWithSigner(signer);
          console.log('✅ Transaction frozen');

          console.log('✍️ Preparing to execute (sign + submit) transaction...');

          // Ensure browser has focus before signing (fixes "Document does not have focus" error)
          window.focus();

          // Wait for user to click to ensure focus and trigger signing
          if (window.toast) {
            window.toast.loading(
              `Please approve the transaction in HashPack...`,
              { id: 'mint' }
            );
          }

          console.log('🔔 Requesting signature and execution from HashPack...');
          console.log('⏰ Waiting for your approval (up to 3 minutes)...');

          // Execute with signer (NO TIMEOUT - let user take their time)
          txResponse = await frozenTx.executeWithSigner(signer);
          console.log('✅ Transaction signed and executed! TX ID:', txResponse.transactionId.toString());

          console.log('⏳ Getting receipt...');
          receipt = await promiseWithTimeout(
            txResponse.getReceiptWithSigner(signer),
            45000 // 45 second timeout for receipt
          );
          console.log('✅ Receipt received');

          // Success! Break out of retry loop
          break;

        } catch (error) {
          const errorMessage = error.message?.toLowerCase() || '';

          // Check if this is a retryable error
          const isRetryable = errorMessage.includes('failed to publish payload') ||
                             errorMessage.includes('relay') ||
                             errorMessage.includes('tag:1108') ||
                             errorMessage.includes('websocket') ||
                             errorMessage.includes('timeout') ||
                             errorMessage.includes('timed out');

          if (isRetryable && mintAttempt < maxMintAttempts) {
            const waitTime = 3000 * mintAttempt;
            console.log(`⚠️ Mint attempt ${mintAttempt} failed: ${error.message}`);
            console.log(`⏳ Retrying in ${waitTime/1000} seconds...`);

            if (window.toast) {
              window.toast.loading(
                `Mint attempt ${mintAttempt} failed. Retrying... (${mintAttempt}/${maxMintAttempts})`,
                { id: 'mint' }
              );
            }

            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          // Not retryable or out of attempts
          console.error('❌ Mint failed:', error);
          throw error;
        }
      }

      if (!txResponse || !receipt) {
        throw new Error('Failed to mint NFT after all attempts');
      }

      const serial = receipt.serials[0].toNumber();
      allSerials.push(serial);
      allTransactionIds.push(txResponse.transactionId.toString());

      console.log(`✅ NFT ${nftNumber} minted! Serial: ${serial}`);

      // Small delay between mints to avoid rate limits
      if (i < metadataURIs.length - 1) {
        console.log('⏱️ Waiting 2 seconds before next mint...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n🎉 All NFTs minted successfully!');
    console.log('📊 Total serials:', allSerials);

    return {
      serials: allSerials,
      transactionId: allTransactionIds[0], // Return first transaction ID
      allTransactionIds,
      status: 'SUCCESS'
    };

  } catch (error) {
    console.error('❌ Failed to mint NFTs:', error);
    throw new Error(`Failed to mint NFTs: ${error.message}`);
  }
}

export default {
  createNFTCollection,
  mintNFTs
};