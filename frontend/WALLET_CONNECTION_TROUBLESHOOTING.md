# Wallet Connection Troubleshooting Guide

## Common Issues & Solutions

### 1. HashPack Extension Not Installed
**Symptoms:**
- Modal doesn't open
- "Failed to connect" error
- No response when clicking connect button

**Solution:**
1. Install HashPack wallet extension from Chrome Web Store
2. Create a wallet in HashPack
3. Make sure the extension is unlocked
4. Refresh your browser and try again

### 2. WalletConnect Initialization Error
**Symptoms:**
- Console errors about "Failed to initialize"
- WebSocket errors
- Timeout errors

**Solution:**
Run this in browser console to clear stale sessions:
```javascript
// Clear WalletConnect sessions
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.startsWith('wc@2') || key.includes('walletconnect'))) {
    localStorage.removeItem(key);
  }
}
location.reload();
```

### 3. Proposal Expired Error
**Symptoms:**
- "Proposal expired" in console
- Connection fails repeatedly

**Solution:**
This is already handled in the code, but you can manually clear:
```javascript
// In browser console
clearWalletConnectSessions();
```

### 4. Network/DNS Issues
**Symptoms:**
- Very slow connection
- Timeouts
- WebSocket connection fails

**Solution:**
- Check your internet connection
- Try disabling VPN
- Clear browser cache
- Use a different network

## Debugging Steps

### Step 1: Open Browser Console
Press F12 in your browser and check for errors

### Step 2: Look for These Messages
- ✅ "HashConnect initialized" - Good!
- ✅ "WalletConnect initialized" - Good!
- ❌ "Failed to initialize" - Problem with setup
- ❌ "WebSocket" errors - Network issue
- ❌ "Proposal expired" - Clear sessions

### Step 3: Check What's Installed
In browser console:
```javascript
// Check if HashPack is installed
console.log('HashPack installed:', typeof window.hashpack !== 'undefined');

// Check WalletConnect
console.log('DAppConnector available:', typeof window.dappConnector !== 'undefined');
```

### Step 4: Test Connection Manually
In browser console:
```javascript
// Import and test
import { openHashPackModal } from './services/wallets/hashpackClient';
await openHashPackModal();
```

## Quick Fixes

### Fix 1: Clear Everything and Restart
```javascript
// In browser console
localStorage.clear();
location.reload();
```

### Fix 2: Clear Only Wallet Data
```javascript
// In browser console
localStorage.removeItem('wallet');
localStorage.removeItem('hashconnect_pairing');
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');
// Clear WalletConnect
for (let i = localStorage.length - 1; i >= 0; i--) {
  const key = localStorage.key(i);
  if (key && key.includes('wc')) {
    localStorage.removeItem(key);
  }
}
location.reload();
```

### Fix 3: Force Reconnect
```javascript
// In browser console
import { clearWalletConnectSessions } from './services/wallets/hashpackClient';
clearWalletConnectSessions();
location.reload();
```

## Installation Checklist

- [ ] HashPack extension installed
- [ ] Wallet created in HashPack
- [ ] Extension is unlocked
- [ ] On Hedera Testnet (not Mainnet)
- [ ] Browser console has no red errors
- [ ] Internet connection is stable

## Still Not Working?

1. **Check WalletConnect Project ID**
   - Current ID in code: `377d75bb6f86a2ffd427d032ff6ea7d3`
   - Get your own at: https://cloud.walletconnect.com
   - Update in `frontend/src/services/wallets/hashpackClient.jsx`

2. **Update Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Check for Package Issues**
   ```bash
   npm list @hashgraph/hedera-wallet-connect
   npm list hashconnect
   ```

4. **Try Mobile HashPack**
   - Open HashPack mobile app
   - Scan QR code from WalletConnect modal

## Error Messages Explained

| Error | Meaning | Fix |
|-------|---------|-----|
| "Connection timeout" | HashPack didn't respond | Unlock extension, try again |
| "User rejected" | You cancelled in HashPack | Click approve in extension |
| "No accounts found" | No wallet in HashPack | Create wallet first |
| "Proposal expired" | Old connection attempt stuck | Clear sessions (see above) |
| "WebSocket failed" | Network issue | Check internet, clear cache |
| "Not initialized" | Setup failed | Refresh page |
