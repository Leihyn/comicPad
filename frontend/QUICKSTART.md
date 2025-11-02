# Comic Pad - Quick Start Guide ⚡

Get up and running with Comic Pad in 5 minutes!

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open in Browser
Open [http://localhost:5173](http://localhost:5173) (or 5174 if 5173 is in use)

---

## 🔌 Connect Your Wallet

### Prerequisites
1. Install [HashPack Extension](https://www.hashpack.app/download)
2. Create a Hedera testnet account in HashPack
3. Make sure HashPack is unlocked

### Connection Steps
1. Click the **"CONNECT WALLET"** button in the header
2. Approve the connection in the HashPack popup
3. Done! Your account ID will show in the header

---

## 📁 Project Structure (Quick Reference)

```
frontend/
├── src/
│   ├── App.jsx              # Main app with routes
│   ├── main.jsx             # Entry point
│   ├── contexts/
│   │   ├── WalletContext.jsx   # Wallet state
│   │   └── AuthContext.jsx     # Auth state
│   ├── pages/
│   │   ├── Home.jsx            # Homepage
│   │   ├── Explore.jsx         # Comics browser
│   │   └── Marketplace.jsx     # NFT marketplace
│   ├── components/          # Reusable components
│   ├── services/            # API services
│   ├── hooks/               # Custom hooks
│   └── styles/
│       └── globals.css      # Global styles + Tailwind
├── tailwind.config.js       # Tailwind configuration
└── vite.config.js           # Vite configuration
```

---

## 🎨 Custom Tailwind Classes

Use these in your components:

```jsx
// Buttons
<button className="btn-comic">Primary Button</button>
<button className="btn-comic-outline">Outline Button</button>

// Panels
<div className="comic-panel">Card Content</div>

// Badges
<span className="badge-pow">Badge Text</span>

// Animations
<div className="animate-float">Floating Element</div>
<div className="animate-pop">Pop Animation</div>
<div className="animate-shake">Shake Animation</div>
```

---

## 🎯 Common Tasks

### Add a New Page
1. Create `src/pages/NewPage.jsx`
2. Add route in `src/App.jsx`:
```jsx
<Route path="/new-page" element={<NewPage />} />
```

### Use Wallet Context
```jsx
import { useWallet } from './contexts/WalletContext';

function MyComponent() {
  const { wallet, isConnected, connectWallet } = useWallet();

  return (
    <div>
      {isConnected ? (
        <p>Connected: {wallet.accountId}</p>
      ) : (
        <button onClick={connectWallet}>Connect</button>
      )}
    </div>
  );
}
```

### Add API Call
```jsx
import axios from 'axios';

// API calls automatically proxy to http://localhost:3001
const response = await axios.get('/api/comics');
```

---

## 🐛 Common Issues & Fixes

### Issue: Port already in use
**Solution:** Vite will automatically use the next port (5174, 5175, etc.)

### Issue: HashPack not detected
**Solution:**
1. Ensure extension is installed and enabled
2. Refresh the page
3. Check console for errors

### Issue: Styles not applying
**Solution:**
```bash
# Restart dev server
npm run dev
```

### Issue: Module not found
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Key Documentation

- **SETUP.md** - Detailed setup and configuration
- **TESTING_CHECKLIST.md** - Comprehensive testing guide
- **PROJECT_STATUS.md** - Current project status
- **QUICKSTART.md** - This file

---

## 🔥 Hot Tips

### Development
- **HMR is enabled** - Changes reflect instantly
- **Console logs help** - Check browser console for debug info
- **React DevTools** - Install browser extension for better debugging

### Styling
- **Tailwind IntelliSense** - Install VS Code extension for autocomplete
- **Custom colors** - Use `comic-yellow`, `comic-red`, `dark-900`, etc.
- **Comic fonts** - Use `font-comic` class for headings

### Wallet
- **Testnet only** - Currently configured for Hedera testnet
- **LocalStorage** - Wallet state persists across refreshes
- **Event-driven** - HashConnect uses events for connection status

---

## 🎬 Demo Flow

### First Time User Journey:
1. **Visit Homepage** → See epic hero section
2. **Click "Connect Wallet"** → HashPack popup appears
3. **Approve Connection** → Account ID shows in header
4. **Explore Comics** → Navigate to /explore
5. **Visit Marketplace** → Navigate to /marketplace
6. **Disconnect** → Click disconnect button

### Developer Journey:
1. **Clone & Install** → Get codebase running
2. **Explore Code** → Understand structure
3. **Make Changes** → See instant HMR updates
4. **Test Wallet** → Connect HashPack
5. **Build Features** → Add new functionality

---

## 🚀 Next Actions

### For Developers:
1. ✅ Get app running locally
2. ✅ Test wallet connection
3. ⬜ Connect backend API
4. ⬜ Implement comic listing
5. ⬜ Add marketplace features

### For Designers:
1. ✅ Review current UI/UX
2. ⬜ Create additional pages
3. ⬜ Design comic reader
4. ⬜ Optimize mobile experience

### For Product:
1. ✅ Review functionality
2. ⬜ Test user flows
3. ⬜ Define requirements
4. ⬜ Plan roadmap

---

## 📞 Need Help?

### Check Documentation:
- SETUP.md for detailed setup
- TESTING_CHECKLIST.md for testing
- PROJECT_STATUS.md for project overview

### Debug Steps:
1. Check browser console for errors
2. Verify HashPack is installed
3. Ensure backend is running (if needed)
4. Check network requests in DevTools

### Common Commands:
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## ✅ Success Checklist

You're ready to develop when:
- [x] App loads at localhost:5173
- [x] No console errors
- [x] Wallet connects successfully
- [x] All pages navigate properly
- [x] Styles render correctly
- [x] HMR works when editing files

---

**You're all set! Start building amazing comic experiences! 🦸‍♂️⚡**
