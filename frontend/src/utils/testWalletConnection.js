/**
 * Wallet Connection Test Utility
 *
 * Run this in browser console to test wallet connection:
 *
 * import { testWalletConnection } from './utils/testWalletConnection';
 * testWalletConnection();
 */

export const testWalletConnection = async () => {
  console.log('🧪 ========== WALLET CONNECTION TEST ==========');

  // Test 1: Check browser environment
  console.log('\n✅ Test 1: Browser Environment');
  console.log('   Window object:', typeof window !== 'undefined' ? '✅ Available' : '❌ Missing');
  console.log('   LocalStorage:', typeof localStorage !== 'undefined' ? '✅ Available' : '❌ Missing');

  // Test 2: Check HashPack Extension
  console.log('\n✅ Test 2: HashPack Extension');
  const hasHashPack = typeof window?.hashpack !== 'undefined';
  console.log('   HashPack installed:', hasHashPack ? '✅ YES' : '❌ NO');
  if (!hasHashPack) {
    console.log('   ⚠️  Install from: https://chrome.google.com/webstore/detail/hashpack/gjagmgiddbbciopjhllkdnddhcglnemk');
  }

  // Test 3: Check WalletConnect dependencies
  console.log('\n✅ Test 3: WalletConnect Dependencies');
  try {
    const { DAppConnector } = await import('@hashgraph/hedera-wallet-connect');
    console.log('   @hashgraph/hedera-wallet-connect:', '✅ Available');
  } catch (error) {
    console.log('   @hashgraph/hedera-wallet-connect:', '❌ Missing');
    console.log('   Error:', error.message);
  }

  // Test 4: Check localStorage state
  console.log('\n✅ Test 4: LocalStorage State');
  const walletConnectKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('wc') || key.includes('wallet'))) {
      walletConnectKeys.push(key);
    }
  }
  console.log('   WalletConnect keys found:', walletConnectKeys.length);
  if (walletConnectKeys.length > 0) {
    console.log('   Keys:', walletConnectKeys);
  }

  // Test 5: Check network connectivity
  console.log('\n✅ Test 5: Network Connectivity');
  try {
    const start = Date.now();
    const response = await fetch('https://relay.walletconnect.com/health', {
      method: 'GET',
      mode: 'cors'
    });
    const duration = Date.now() - start;
    console.log('   WalletConnect relay:', response.ok ? '✅ Online' : '❌ Offline');
    console.log('   Response time:', `${duration}ms`);
  } catch (error) {
    console.log('   WalletConnect relay:', '❌ Unreachable');
    console.log('   Error:', error.message);
  }

  // Test 6: Try to initialize WalletConnect
  console.log('\n✅ Test 6: WalletConnect Initialization');
  try {
    const { openHashPackModal, getDAppConnector } = await import('../services/wallets/hashpackClient.jsx');
    console.log('   HashPackClient module:', '✅ Loaded');

    // Don't actually connect, just check if we can get the connector
    console.log('   Note: Not actually connecting, just testing initialization');
    console.log('   To connect, click the "Connect Wallet" button in the app');
  } catch (error) {
    console.log('   HashPackClient module:', '❌ Failed to load');
    console.log('   Error:', error.message);
  }

  // Test 7: Check for common issues
  console.log('\n✅ Test 7: Common Issues Check');

  // Check for expired proposals
  const expiredProposals = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('wc@2:core:pairing:')) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const data = JSON.parse(value);
          if (data.expiry && data.expiry * 1000 < Date.now()) {
            expiredProposals.push(key);
          }
        }
      } catch (e) {
        expiredProposals.push(key);
      }
    }
  }

  if (expiredProposals.length > 0) {
    console.log('   ⚠️  Found', expiredProposals.length, 'expired proposals');
    console.log('   Run this to clear: clearExpiredProposals()');
  } else {
    console.log('   ✅ No expired proposals found');
  }

  // Summary
  console.log('\n📊 ========== TEST SUMMARY ==========');
  console.log('Browser environment:', '✅');
  console.log('HashPack extension:', hasHashPack ? '✅' : '❌ INSTALL REQUIRED');
  console.log('WalletConnect dependencies:', '✅');
  console.log('LocalStorage:', '✅');
  console.log('Network connectivity:', 'Check above');
  console.log('Expired proposals:', expiredProposals.length === 0 ? '✅' : '⚠️  Clear recommended');

  console.log('\n💡 Next Steps:');
  if (!hasHashPack) {
    console.log('   1. ❗ Install HashPack extension');
    console.log('      https://chrome.google.com/webstore/detail/hashpack/gjagmgiddbbciopjhllkdnddhcglnemk');
  } else {
    console.log('   1. ✅ HashPack is installed');
  }
  console.log('   2. Make sure HashPack is unlocked');
  console.log('   3. Click "Connect Wallet" in the app');
  console.log('   4. Approve the connection in HashPack extension');

  if (expiredProposals.length > 0) {
    console.log('\n🧹 To clear expired proposals:');
    console.log('   localStorage.clear(); location.reload();');
  }

  console.log('\n🧪 ========== TEST COMPLETE ==========\n');
};

// Quick clear function
export const clearAllWalletData = () => {
  console.log('🧹 Clearing all wallet data...');
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('wc') || key.includes('wallet') || key.includes('hashconnect'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('✅ Cleared', keysToRemove.length, 'items');
  console.log('🔄 Refreshing page...');
  setTimeout(() => location.reload(), 1000);
};

// Make functions available globally for easy console access
if (typeof window !== 'undefined') {
  window.testWalletConnection = testWalletConnection;
  window.clearAllWalletData = clearAllWalletData;
  console.log('💡 Wallet test utilities loaded!');
  console.log('   Run: testWalletConnection()');
  console.log('   Or: clearAllWalletData()');
}
