# Comic Pad Frontend - Setup & Configuration Guide

## 🚀 Project Overview

**Comic Pad** is a decentralized comic book publishing platform built on **Hedera Hashgraph**. This frontend application allows users to publish, collect, and trade comic book NFTs with near-zero fees and true ownership.

## ✅ Current Status

### What's Working
- ✅ **Modern React Application** - Using React 18 with JSX
- ✅ **HashConnect Integration** - Wallet connection with HashPack extension
- ✅ **Comic-Themed UI** - Complete with animations and custom styling
- ✅ **Tailwind CSS** - Fully configured with custom comic colors and utilities
- ✅ **React Router** - Navigation between pages (Home, Explore, Marketplace)
- ✅ **Context Providers** - WalletContext and AuthContext for state management
- ✅ **Toast Notifications** - Using react-hot-toast for user feedback
- ✅ **Responsive Design** - Mobile-friendly with hamburger menu

### Dependencies Installed
```json
{
  "@hashgraph/hedera-wallet-connect": "^1.5.1",
  "@hashgraph/sdk": "^2.38.0",
  "hashconnect": "^3.0.14",
  "react": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "react-hot-toast": "^2.4.1",
  "tailwindcss": "^3.4.18",
  "vite": "^5.0.8"
}
```

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The application will run on:
- **Local**: http://localhost:5173 (or 5174 if 5173 is in use)
- **Network**: Use `--host` flag to expose

### 3. Build for Production
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```

## 🎨 Styling Configuration

### Tailwind Config
Located at: `tailwind.config.js`

**Custom Colors:**
```javascript
comic: {
  yellow: '#FFD700',
  red: '#FF0000',
  blue: '#0066FF',
  purple: '#9B30FF',
  green: '#00FF00',
  orange: '#FF8C00',
  pink: '#FF69B4',
  cyan: '#00FFFF',
}
dark: {
  900: '#0A0A0A',
  800: '#1A1A1A',
  700: '#2A2A2A',
  600: '#3A3A3A',
}
```

**Custom Animations:**
- `animate-float` - Floating animation for elements
- `animate-pop` - Pop-in animation
- `animate-shake` - Shake animation

**Custom Components:**
- `.btn-comic` - Comic-style primary button
- `.btn-comic-outline` - Outlined comic button
- `.comic-panel` - Panel with border and shadow
- `.badge-pow` - Badge component
- `.halftone` - Halftone background pattern

### Fonts
- **Primary**: Bangers (Comic style headings)
- **Secondary**: Righteous (Display text)
- **Body**: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI')

## 🔌 HashPack Wallet Integration

### How It Works
1. **HashConnect SDK** - Uses the HashConnect library to communicate with HashPack extension
2. **Event-Based Connection** - Listens for pairing, disconnection, and status change events
3. **Local Storage Persistence** - Saves wallet connection state for automatic reconnection
4. **Testnet Configuration** - Currently configured for Hedera testnet

### WalletContext API
```javascript
import { useWallet } from './contexts/WalletContext';

const {
  wallet,           // Wallet data object
  isConnected,      // Boolean connection status
  connecting,       // Boolean loading state
  connectWallet,    // Function to connect
  disconnectWallet, // Function to disconnect
  hashconnect       // HashConnect instance
} = useWallet();
```

### Testing Wallet Connection
1. **Install HashPack** extension in your browser
2. **Create/Import** a Hedera account
3. Click "**Connect Wallet**" button in the app
4. **Approve** the connection in the HashPack popup
5. Your account ID will be displayed in the header

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── common/       # Common UI components
│   │   ├── comic/        # Comic-specific components
│   │   ├── creator/      # Creator studio components
│   │   ├── layout/       # Layout components
│   │   └── wallet/       # Wallet components
│   ├── contexts/         # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── WalletContext.jsx
│   │   └── CartContext.jsx
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   │   ├── Home.jsx
│   │   ├── Explore.jsx
│   │   ├── Marketplace.jsx
│   │   ├── ComicDetail.jsx
│   │   ├── Profile.jsx
│   │   ├── CreatorStudio.jsx
│   │   └── Reader.jsx
│   ├── services/         # API and service layers
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── comicService.js
│   │   ├── hederaService.js
│   │   └── ipfsService.js
│   ├── styles/           # Global styles
│   │   └── globals.css
│   ├── utils/            # Utility functions
│   ├── App.jsx           # Main App component
│   └── main.jsx          # Entry point
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── postcss.config.js
```

## 🔧 Configuration Files

### vite.config.js
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

### Backend API Proxy
All API requests to `/api/*` are proxied to `http://localhost:3001`

## 🎯 Features

### Current Pages

#### 1. Home Page (/)
- Epic hero section with animations
- Features showcase
- Stats section
- Call-to-action buttons
- Fully responsive design

#### 2. Explore (/explore)
- Comic discovery page
- Placeholder for backend integration

#### 3. Marketplace (/marketplace)
- NFT marketplace page
- Placeholder for backend integration

### Component Library
The project includes a comprehensive component library in `src/components/common/`:
- **Button** - Customizable button component
- **Card** - Card container
- **Input** - Form input component
- **Modal** - Modal dialog
- **Spinner** - Loading spinner
- **Toast** - Toast notifications
- **ProtectedRoute** - Route guard component

## 🐛 Troubleshooting

### Issue: HashPack Not Detected
**Solution:**
1. Ensure HashPack extension is installed and enabled
2. Refresh the page (HashConnect loads asynchronously)
3. Check browser console for initialization logs
4. Make sure you're using a supported browser (Chrome, Brave, Edge)

### Issue: Port Already in Use
**Solution:**
Vite automatically tries the next available port (5174, 5175, etc.)

### Issue: Tailwind Styles Not Applying
**Solution:**
1. Ensure `tailwind.config.js` has correct content paths
2. Check that `globals.css` imports Tailwind directives
3. Restart dev server

### Issue: Module Not Found
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📝 Development Notes

### HashConnect Deprecation
The `hashconnect` package is deprecated and will be shut down by 2026. For future development, consider migrating to:
- **@hashgraph/hedera-wallet-connect** (already installed)
- **WalletConnect v2** for broader wallet support

### TypeScript Migration
The project currently uses JSX. To migrate to TypeScript:
1. Rename files from `.jsx` to `.tsx`
2. Add type definitions
3. Update `vite.config.js` if needed

## 🚀 Next Steps

### Backend Integration
1. Connect to backend API endpoints
2. Implement comic fetching and display
3. Add marketplace functionality
4. Integrate IPFS for comic storage

### Enhanced Features
1. User authentication flow
2. Creator studio for uploading comics
3. Comic reader with page navigation
4. User profiles and collections
5. NFT minting and trading

### Performance Optimization
1. Implement lazy loading for images
2. Add React.memo for expensive components
3. Optimize bundle size
4. Add service worker for offline support

## 📚 Resources

- [Hedera Documentation](https://docs.hedera.com/)
- [HashConnect GitHub](https://github.com/hashgraph/hashconnect)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Router Docs](https://reactrouter.com/)

## 📄 License

This project is part of the Comic Pad decentralized platform.

---

**Built with ⚡ on Hedera Hashgraph**
