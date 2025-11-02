# NFT Minting Troubleshooting Guide

## Issue: HashPack Popup Not Appearing

### Why This Happens
WalletConnect has a known issue where signing popups don't appear if:
- The browser tab doesn't have focus
- Multiple tabs are open
- Browser is in the background
- HashPack extension is not responding

### Quick Fixes

#### Method 1: Manual HashPack Trigger (Recommended)
1. When you click "Mint NFT" and see the message ready to sign
2. **Click the HashPack extension icon** in your browser toolbar
3. The pending signature should appear in HashPack
4. Approve it

#### Method 2: Ensure Tab Focus
1. **Click on the Comic Pad browser tab** before minting
2. **Don't switch tabs** during minting
3. Keep the browser window in the foreground
4. Wait for HashPack popup to appear

#### Method 3: Refresh Everything
```javascript
// In browser console (F12):
localStorage.clear();
location.reload();
```
Then:
1. Reconnect wallet
2. Try minting again
3. Keep the tab focused

#### Method 4: Disconnect and Reconnect
1. Click "Disconnect" in the app
2. Wait 3 seconds
3. Click "Connect Wallet"
4. Wait for connection
5. Try minting again

### If Minting Times Out After 60-90 Seconds

The transaction might have actually succeeded! Check:
1. Go to [HashScan Testnet](https://hashscan.io/testnet)
2. Search for your account ID (e.g., 0.0.7163232)
3. Look for recent NFT mint transactions
4. If you see successful mints, **don't mint again** or you'll create duplicates

### Error Messages Explained

**"Operation timed out"**
- HashPack didn't respond within 90 seconds
- Either you didn't sign, or the popup didn't appear
- Check if transaction succeeded on HashScan

**"Document does not have focus, skipping deeplink"**
- Browser tab was in the background
- WalletConnect couldn't trigger HashPack popup
- Click on the tab and try again

**"Failed to publish payload, tag:1108"**
- WalletConnect relay server issue
- Wait a few seconds and it will retry automatically
- Not your fault - WalletConnect infrastructure issue

### Best Practices

1. ✅ **Mint during off-peak hours** (fewer WalletConnect users)
2. ✅ **Close other tabs** to ensure focus
3. ✅ **Keep HashPack unlocked** before minting
4. ✅ **Click manually on HashPack icon** when prompted
5. ✅ **Wait patiently** - don't click mint button multiple times
6. ✅ **Check HashScan** to verify if NFTs actually minted

### Advanced: Manual Signing Process

If automatic popup continues to fail:

1. Start minting in the app
2. Open HashPack extension manually (click icon)
3. Look for pending transaction
4. Approve it
5. Transaction should complete

### Still Not Working?

Try these alternatives:

**Option A: Use HashPack Mobile App**
1. Install HashPack on your phone
2. When WalletConnect modal appears, scan QR code
3. Approve transactions on mobile
4. More reliable than browser extension

**Option B: Try Different Browser**
- Chrome works best
- Brave can have issues
- Firefox works well
- Edge works well

**Option C: Different Time**
- WalletConnect servers can be overloaded
- Try during US night time (less traffic)
- Mornings usually work better than evenings

### Success Indicators

You'll know minting succeeded when you see:
```
✅ Transaction executed! TX ID: 0.0.xxxxx@xxxxx
✅ Receipt received
✅ NFT 1 minted! Serial: X
```

### Contact Support

If none of these work:
1. Take screenshot of console errors (F12)
2. Note your account ID
3. Check HashScan for successful transactions
4. Report the specific error message
