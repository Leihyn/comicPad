# 🚀 Quick Fixes Reference Card

**Use this as a quick reference while fixing issues. See SOLUTIONS_GUIDE.md for detailed solutions.**

---

## ⚡ 3 CRITICAL FIXES (DO FIRST)

### 1. Fix .env Security Issue
```bash
# Remove from git
cd backend
git rm --cached .env

# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env with new secret
# Regenerate Pinata JWT at: https://app.pinata.cloud/developers/api-keys
```

### 2. Convert TypeScript Files
```bash
# Rename files
mv frontend/src/components/ComicCard.tsx frontend/src/components/ComicCard.jsx
mv frontend/src/components/SearchFilters.tsx frontend/src/components/SearchFilters.jsx
mv frontend/src/styles/GlobalStyles.tsx frontend/src/styles/GlobalStyles.jsx

# Then remove TypeScript types manually in each file
```

### 3. Fix Duplicate User Model
```javascript
// backend/src/models/index.js
// DELETE the entire userSchema definition
// KEEP only imports:

import User from './User.js';
import Comic from './Comic.js';
import Transaction from './Transaction.js';

export { User, Comic, Transaction };
```

---

## 🔥 TOP 5 HIGH-PRIORITY FIXES

### 4. Add Environment Validation

**Create:** `backend/src/config/validateEnv.js`
```javascript
export const validateEnv = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];
  const missing = required.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('Missing env vars:', missing);
    process.exit(1);
  }
};
```

**Add to:** `backend/src/server.js`
```javascript
import { validateEnv } from './config/validateEnv.js';
dotenv.config();
validateEnv(); // Add this line
```

### 5. Initialize Services at Startup

**Add to:** `backend/src/server.js` (after connectDB)
```javascript
// Initialize services
await ipfsService.initialize();
await hederaService.initialize();
```

**Add to:** `backend/src/services/hederaService.js`
```javascript
async initialize() {
  if (this.initialized) return;

  this.client = Client.forTestnet();
  this.client.setOperator(
    AccountId.fromString(process.env.HEDERA_OPERATOR_ID),
    PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY)
  );

  this.initialized = true;
  logger.info('✅ Hedera initialized');
}
```

### 6. Fix Deprecated MongoDB Options

**In:** `backend/src/config/database.js`
```javascript
// REMOVE these lines:
// useNewUrlParser: true,
// useUnifiedTopology: true,

// KEEP only:
const conn = await mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  family: 4
});
```

### 7. Implement Missing Routes

**Add to:** `backend/src/controllers/comicController.js`
```javascript
export const favoriteComic = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.favorites.includes(req.params.id)) {
    user.favorites.push(req.params.id);
    await user.save();
  }
  res.json({ success: true, data: { favorites: user.favorites } });
};

export const unfavoriteComic = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.favorites = user.favorites.filter(id => id.toString() !== req.params.id);
  await user.save();
  res.json({ success: true, data: { favorites: user.favorites } });
};
```

### 8. Add File Cleanup to Error Handling

**Add to:** `backend/src/server.js` (before error handlers)
```javascript
import { autoCleanup } from './middleware/upload.js';

// ... routes ...

app.use(autoCleanup);  // Add this BEFORE error handlers
app.use(notFound);
app.use(errorHandler);
```

---

## 💡 QUICK IMPROVEMENTS

### Add Database Indexes
```javascript
// In each model schema, add:
userSchema.index({ email: 1 });
userSchema.index({ 'wallet.accountId': 1 });

comicSchema.index({ title: 'text', description: 'text' });
comicSchema.index({ creator: 1, createdAt: -1 });
comicSchema.index({ genre: 1 });

transactionSchema.index({ buyer: 1, createdAt: -1 });
transactionSchema.index({ transactionHash: 1 });
```

### Persist Wallet State
```javascript
// frontend/src/contexts/WalletContext.jsx

const [wallet, setWallet] = useState(() => {
  const saved = localStorage.getItem('wallet_state');
  return saved ? JSON.parse(saved) : null;
});

useEffect(() => {
  if (wallet) {
    localStorage.setItem('wallet_state', JSON.stringify(wallet));
  } else {
    localStorage.removeItem('wallet_state');
  }
}, [wallet]);
```

### Standardize API Responses
```javascript
// Create: backend/src/utils/responseFormatter.js

export const successResponse = (res, data, message = 'Success') => {
  return res.json({ success: true, message, data });
};

export const errorResponse = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({ success: false, message });
};

// Use in controllers:
import { successResponse, errorResponse } from '../utils/responseFormatter.js';

return successResponse(res, comic, 'Comic retrieved');
return errorResponse(res, 'Comic not found', 404);
```

### Add Error Boundary (React)
```javascript
// frontend/src/components/common/ErrorBoundary.jsx

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <button onClick={() => window.location.href = '/'}>
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 🧪 TESTING COMMANDS

### Test Backend
```bash
# Start backend
cd backend
npm run dev

# Test health
curl http://localhost:3001/health

# Test auth
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"password123"}'
```

### Test Frontend
```bash
# Start frontend
cd frontend
npm run dev

# Open browser to http://localhost:5173
```

### Test Database
```bash
# Check MongoDB connection
mongosh "mongodb://localhost:27017/comicpad"

# List collections
show collections

# Check users
db.users.find().limit(5)
```

---

## 🐛 DEBUGGING TIPS

### Check Logs
```bash
# Backend logs
tail -f backend/logs/error.log
tail -f backend/logs/combined.log

# Enable debug logging
# Add to backend/.env:
LOG_LEVEL=debug
```

### Common Errors

**"Cannot find module"**
```bash
npm install
```

**"Port already in use"**
```bash
# Kill process on port 3001
npx kill-port 3001

# Or change port in .env
PORT=3002
```

**"MongoDB connection failed"**
```bash
# Check MongoDB is running
mongosh

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/comicpad
```

**"IPFS upload failed"**
```bash
# Check Pinata JWT in .env
PINATA_JWT=your-valid-jwt-token

# Test Pinata auth
curl https://api.pinata.cloud/data/testAuthentication \
  -H "Authorization: Bearer YOUR_JWT"
```

**"Hedera transaction failed"**
```bash
# Check Hedera credentials in .env
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_KEY=302e0201...

# Check testnet status
https://status.hedera.com/
```

---

## 📋 EXECUTION ORDER

1. ✅ Run `fix-critical-issues.bat` (Windows) or `fix-critical-issues.sh` (Mac/Linux)
2. ✅ Fix User model duplication manually
3. ✅ Regenerate secrets in .env
4. ✅ Remove TypeScript types from converted .jsx files
5. ✅ Add environment validation
6. ✅ Initialize services at startup
7. ✅ Test authentication
8. ✅ Test comic upload
9. ✅ Commit changes
10. ✅ Deploy

---

## 🔗 USEFUL LINKS

- **Hedera Portal:** https://portal.hedera.com/
- **Pinata Dashboard:** https://app.pinata.cloud/
- **MongoDB Compass:** Download at mongodb.com/products/compass
- **Full Solutions:** See `SOLUTIONS_GUIDE.md`

---

## 🆘 EMERGENCY ROLLBACK

If something breaks:

```bash
# Revert all changes
git reset --hard HEAD

# Or revert to specific commit
git log --oneline  # Find commit hash
git reset --hard COMMIT_HASH

# Restore specific file
git checkout HEAD -- path/to/file
```

---

**Need more details? Check `SOLUTIONS_GUIDE.md` for complete solutions with explanations!**
