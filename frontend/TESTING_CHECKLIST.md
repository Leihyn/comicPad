# Comic Pad - Testing Checklist

## 🧪 Pre-Testing Setup

### Prerequisites
- [ ] HashPack extension installed in browser
- [ ] Hedera testnet account created in HashPack
- [ ] Backend server running (if testing API integration)
- [ ] Node.js and npm installed

### Environment Check
```bash
# Check Node version (should be 16+ or 18+)
node --version

# Check npm version
npm --version

# Verify dependencies are installed
npm list
```

## 🎯 Testing Guide

### 1. Initial Setup Testing

#### Install & Run
```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

**Expected Results:**
- ✅ No errors during installation
- ✅ Dev server starts successfully
- ✅ Application opens at http://localhost:5173 or 5174
- ✅ No console errors on page load

---

### 2. Visual & UI Testing

#### Homepage Testing
- [ ] Page loads without errors
- [ ] Hero section displays with animations
- [ ] Emoji animations (💥⚡💫🔥✨) are bouncing
- [ ] "PUBLISH! COLLECT! OWN FOREVER!" text has proper shadows
- [ ] Gradient backgrounds render correctly
- [ ] Stats section displays (1,234 comics, 50K HBAR, etc.)
- [ ] Features cards show with hover effects
- [ ] Call-to-action buttons are visible and styled

#### Responsive Design Testing
- [ ] Desktop view (1920x1080)
- [ ] Laptop view (1366x768)
- [ ] Tablet view (768x1024)
- [ ] Mobile view (375x667)
- [ ] Mobile menu hamburger icon appears on small screens
- [ ] Mobile menu opens/closes properly

#### Navigation Testing
- [ ] Click "EXPLORE" - navigates to /explore
- [ ] Click "MARKETPLACE" - navigates to /marketplace
- [ ] Click "COMIC PAD" logo - returns to homepage
- [ ] Browser back/forward buttons work
- [ ] Footer links are clickable (even if placeholder)

---

### 3. HashPack Wallet Connection Testing

#### Connection Flow
1. **Before Connection:**
   - [ ] "CONNECT WALLET" button is visible in header
   - [ ] Button shows wallet icon
   - [ ] Button has gradient styling with shadow effect

2. **Click "Connect Wallet":**
   - [ ] Button shows "CONNECTING..." text
   - [ ] Button is disabled during connection
   - [ ] HashPack extension popup appears
   - [ ] No JavaScript errors in console

3. **In HashPack Popup:**
   - [ ] App name shows as "ComicPad"
   - [ ] App description shows
   - [ ] Network shows "testnet"
   - [ ] Account selection available
   - [ ] "Connect" and "Reject" buttons work

4. **After Approval:**
   - [ ] Success toast notification appears
   - [ ] Toast shows "Connected to [account-id]"
   - [ ] Account ID displays in header (truncated: "0.0.xxxxx...")
   - [ ] "Disconnect" button appears next to account ID
   - [ ] "CONNECT WALLET" button is hidden
   - [ ] Connection persists on page refresh

5. **Console Logs to Check:**
   ```
   ✅ HashConnect initialized
   ✅ Connecting to HashPack...
   ✅ Pairing event: [data object]
   ✅ Pairing successful: [pairing data]
   ```

#### Connection Edge Cases
- [ ] Test with HashPack locked - should show timeout error
- [ ] Test rejecting connection - should show rejection toast
- [ ] Test with no accounts - should show "no accounts" error
- [ ] Test with HashPack not installed - should redirect to download page

#### Disconnection Testing
1. **Click "Disconnect" button:**
   - [ ] Wallet disconnects successfully
   - [ ] "Wallet disconnected" toast appears
   - [ ] Header shows "CONNECT WALLET" button again
   - [ ] Account ID is removed from display
   - [ ] LocalStorage cleared (`wallet` and `hashconnect_pairing`)

2. **Console Check:**
   ```
   ✅ Disconnected from wallet
   ```

---

### 4. LocalStorage Testing

#### Check Stored Data
Open browser DevTools > Application > LocalStorage > http://localhost:5173

**After Connecting Wallet:**
- [ ] `wallet` key exists with JSON data:
  ```json
  {
    "accountId": "0.0.xxxxx",
    "network": "testnet",
    "topic": "...",
    "connected": true,
    "connectedAt": "2025-..."
  }
  ```
- [ ] `hashconnect_pairing` key exists with pairing data

**After Disconnecting:**
- [ ] Both keys are removed

**After Page Refresh (while connected):**
- [ ] Wallet auto-reconnects
- [ ] Account ID displays immediately
- [ ] No new HashPack popup required

---

### 5. Error Handling Testing

#### Network Errors
- [ ] Disconnect internet during connection
- [ ] Should show appropriate error toast
- [ ] Application should not crash

#### HashConnect Initialization
- [ ] Refresh page multiple times
- [ ] Check console for "HashConnect initialized" each time
- [ ] No duplicate event listeners

#### Timeout Testing
- [ ] Let connection attempt timeout (60 seconds)
- [ ] Should show "Connection timeout" error
- [ ] Button should re-enable

---

### 6. Performance Testing

#### Page Load
- [ ] Initial page load < 3 seconds
- [ ] Lighthouse Performance score > 80
- [ ] No layout shift issues
- [ ] Images/assets load properly

#### Memory Leaks
1. Open DevTools > Performance
2. Record while:
   - Connecting wallet
   - Navigating between pages
   - Disconnecting wallet
3. Check for memory leaks

#### Bundle Size
```bash
npm run build
```
- [ ] Build completes successfully
- [ ] Check dist folder size (should be < 2MB)
- [ ] No warnings about large chunks

---

### 7. Browser Compatibility Testing

Test on multiple browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Brave (latest)
- [ ] Safari (if on Mac)

**Note:** HashPack extension is primarily for Chromium-based browsers.

---

### 8. Developer Experience Testing

#### Hot Module Replacement (HMR)
1. Start dev server
2. Edit `src/App.jsx` - change text
3. Save file
- [ ] Page updates without full reload
- [ ] Wallet connection persists

#### Error Messages
- [ ] Tailwind errors show clearly
- [ ] React errors have stack traces
- [ ] Console errors are descriptive

---

### 9. Integration Testing (Future)

When backend is ready:
- [ ] API calls to `/api/comics` work
- [ ] IPFS integration functional
- [ ] NFT minting works
- [ ] User authentication flow
- [ ] Creator studio functionality

---

## 🐛 Known Issues

### Current Limitations
1. **HashConnect Deprecation** - Package will be deprecated by 2026
   - Solution: Plan migration to @hashgraph/hedera-wallet-connect

2. **Explore & Marketplace** - Placeholder pages
   - Solution: Backend integration needed

3. **No TypeScript** - Project uses JSX
   - Solution: Optional TypeScript migration

### Security Vulnerabilities
```bash
npm audit
```
Currently: **15 vulnerabilities (5 low, 5 moderate, 5 critical)**
- These are in dev dependencies and WalletConnect packages
- Run `npm audit fix` for automated fixes
- Manual review recommended for production

---

## ✅ Testing Sign-Off

### Tested By: _______________
### Date: _______________

### Environment
- OS: _______________
- Browser: _______________
- Node Version: _______________
- HashPack Version: _______________

### Test Results
- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Ready for deployment

### Notes
```
[Add any additional observations or issues found during testing]
```

---

## 🚀 Quick Test Script

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Check for errors
npm run lint

# 3. Build test
npm run build

# 4. Start dev server
npm run dev

# 5. Open http://localhost:5173 and test wallet connection
```

---

**Happy Testing! ⚡**
