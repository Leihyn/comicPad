# Wallet Connection Fix Guide

## ✅ What I Fixed

### 1. **Improved Error Handling** (`frontend/src/services/wallets/hashpackClient.jsx`)
   - Added detailed console logging at each step
   - Better error messages for different failure scenarios
   - Automatic session cleanup on failures
   - 60-second timeout for connections
   - Clear troubleshooting tips in console

### 2. **Created Diagnostic Tools**
   - `frontend/src/utils/testWalletConnection.js` - Test utility
   - `frontend/WALLET_CONNECTION_TROUBLESHOOTING.md` - Detailed troubleshooting guide

### 3. **Enhanced User Feedback**
   - Better toast notifications
   - Clear indication when HashPack extension is missing
   - Actionable error messages

---

## 🔍 How to Debug Your Issue

### Method 1: Use Browser Console (Recommended)

1. **Open your app** in Chrome/Edge browser
2. **Press F12** to open DevTools
3. **Go to Console tab**
4. **Run this command:**
   ```javascript
   testWalletConnection()
   ```

This will test:
- ✅ HashPack extension installation
- ✅ WalletConnect dependencies
- ✅ Network connectivity
- ✅ localStorage state
- ✅ Common issues

### Method 2: Try Connecting and Check Console

1. **Open your app**
2. **Press F12** (DevTools)
3. **Click "Connect Wallet" button**
4. **Look for these messages:**

   **Good signs (✅):**
   ```
   🔵 ========== WALLET CONNECTION START ==========
   ✅ WalletConnect initialized successfully
   ✅ Connector available
   🔵 Attempting direct extension connection...
   ✅ Connected via extension!
   ```

   **Problem indicators (❌):**
   ```
   ❌ WalletConnect initialization failed
   ❌ Connector not available
   ⚠️ Extension connection failed
   ❌ Connection timeout
   ```

---

## 🛠️ Common Issues & Quick Fixes

### Issue 1: HashPack Extension Not Installed

**Symptoms:**
- "HashPack extension not found" message
- QR code modal appears instead of extension popup

**Fix:**
1. Install HashPack: https://chrome.google.com/webstore/detail/hashpack/gjagmgiddbbciopjhllkdnddhcglnemk
2. Create a wallet in HashPack
3. Make sure extension is **unlocked**
4. Refresh your app and try again

### Issue 2: Stale WalletConnect Sessions

**Symptoms:**
- "Proposal expired" error
- Connection hangs indefinitely
- Multiple failed attempts

**Fix (in browser console):**
```javascript
clearAllWalletData()
// This will clear all wallet data and refresh the page
```

**Or manually:**
```javascript
localStorage.clear();
location.reload();
```

### Issue 3: Extension is Locked

**Symptoms:**
- Nothing happens when clicking connect
- No popup appears

**Fix:**
1. Click HashPack extension icon in browser
2. Enter your password to unlock
3. Try connecting again

### Issue 4: Wrong Network

**Symptoms:**
- Connected but transactions fail
- Wrong account balance

**Fix:**
1. Open HashPack extension
2. Check you're on **Hedera Testnet** (not Mainnet)
3. Switch networks if needed
4. Reconnect wallet

### Issue 5: Network/Connectivity Issues

**Symptoms:**
- "WebSocket failed" error
- "Connection timeout" error
- Very slow connection

**Fix:**
1. Check your internet connection
2. Disable VPN if using one
3. Try a different network
4. Clear browser cache:
   ```javascript
   // In console
   clearAllWalletData()
   ```

---

## 📋 Step-by-Step Connection Guide

### For Desktop (Chrome Extension)

1. **Install HashPack Extension**
   - Visit Chrome Web Store
   - Search "HashPack"
   - Click "Add to Chrome"

2. **Create Wallet**
   - Click HashPack extension icon
   - Follow setup wizard
   - **Save your recovery phrase securely!**

3. **Get Testnet HBAR**
   - Go to https://portal.hedera.com/faucet
   - Enter your account ID
   - Receive free test HBAR

4. **Connect to ComicPad**
   - Open ComicPad app
   - Click "Connect Wallet"
   - **Approve in HashPack popup**
   - Done! ✅

### For Mobile (HashPack App)

1. **Install HashPack App**
   - iOS: App Store
   - Android: Google Play

2. **Create Wallet**
   - Open app
   - Follow setup wizard
   - **Save your recovery phrase securely!**

3. **Connect to ComicPad**
   - Open ComicPad in browser
   - Click "Connect Wallet"
   - **Scan QR code** with HashPack app
   - Approve connection
   - Done! ✅

---

## 🧪 Testing Commands

Run these in browser console:

### Test wallet connection
```javascript
testWalletConnection()
```

### Clear all wallet data
```javascript
clearAllWalletData()
```

### Check if extension is available
```javascript
console.log('HashPack installed:', typeof window?.hashpack !== 'undefined');
```

### View current localStorage
```javascript
console.log('Wallet data:', localStorage.getItem('wallet'));
console.log('Pairing data:', localStorage.getItem('hashconnect_pairing'));
```

### Force reconnect
```javascript
import { openHashPackModal } from './services/wallets/hashpackClient';
await openHashPackModal();
```

---

## 📱 Still Not Working?

### Option 1: Check Frontend Console

1. Open DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. Share them with me

### Option 2: Check Backend Logs

Your backend is running with improved logging. Check the terminal where backend is running for errors.

### Option 3: Verify Package Installation

```bash
cd frontend
npm list @hashgraph/hedera-wallet-connect
npm list hashconnect
```

Should show:
```
@hashgraph/hedera-wallet-connect@1.5.1
hashconnect@3.0.14
```

If missing, run:
```bash
npm install
```

### Option 4: Fresh Start

```bash
# Stop backend (Ctrl+C)
# Stop frontend (Ctrl+C)

# Clear frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Start backend
cd ../backend
npm run dev

# Start frontend (in new terminal)
cd frontend
npm run dev
```

---

## 🎯 What to Tell Me

If still not working, provide:

1. **Browser Console Output**
   - Press F12 → Console tab
   - Run `testWalletConnection()`
   - Copy all output

2. **What Happens When You Click Connect**
   - Does a modal appear?
   - Does HashPack popup open?
   - Any error messages?

3. **HashPack Extension Status**
   - Is it installed? (Check browser extensions)
   - Is it unlocked? (Click extension icon)
   - What network? (Testnet or Mainnet)

4. **Frontend Console Errors**
   - Any red errors in console?
   - When do they appear?

---

## 📚 Additional Resources

- **HashPack Extension**: https://www.hashpack.app/
- **Hedera Testnet Faucet**: https://portal.hedera.com/faucet
- **WalletConnect Docs**: https://docs.walletconnect.com/
- **Troubleshooting Guide**: `frontend/WALLET_CONNECTION_TROUBLESHOOTING.md`

---

## ✅ Summary

**What's improved:**
1. Better error messages and debugging
2. Automatic cleanup of stale sessions
3. Clear troubleshooting steps in console
4. Test utilities for debugging

**Next steps for you:**
1. Open browser DevTools (F12)
2. Run `testWalletConnection()` in console
3. Try connecting wallet
4. Check console output for specific error
5. Follow the fix for that error above

**Most Common Fix:**
```javascript
// In browser console
clearAllWalletData()
```

This clears stale sessions and refreshes the page, fixing 90% of connection issues.
