# Vercel Deployment Guide for Comic Pad

This guide will walk you through deploying both the backend and frontend to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. [Vercel CLI](https://vercel.com/docs/cli) installed (optional but recommended)
3. MongoDB Atlas account (for production database)
4. Hedera testnet/mainnet account
5. Pinata account for IPFS storage

## Project Structure

This is a monorepo with two deployable parts:
- `backend/` - Express.js API (deployed as Vercel Serverless Functions)
- `frontend/` - React + Vite app (deployed as static site)

---

## Part 1: Deploy Backend API

### Step 1: Prepare Backend

The backend is already configured with `backend/vercel.json`. Review the file:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "src/server.js"
    }
  ]
}
```

### Step 2: Deploy Backend to Vercel

#### Option A: Using Vercel Dashboard (Recommended for first deployment)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: Leave empty (not needed for Node.js)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

5. Click "Deploy"

#### Option B: Using Vercel CLI

```bash
cd backend
vercel
```

Follow the prompts and select:
- Set up and deploy: Yes
- Which scope: Your account
- Link to existing project: No
- Project name: comic-pad-backend
- Directory: ./
- Override settings: No

### Step 3: Configure Backend Environment Variables

In the Vercel Dashboard for your backend project:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables (use values from your `.env` file):

**Required Variables:**
- `NODE_ENV` = `production`
- `MONGODB_URI` = `mongodb+srv://...` (your MongoDB Atlas connection string)
- `JWT_SECRET` = `your-secret-key`
- `JWT_EXPIRE` = `7d`
- `JWT_COOKIE_EXPIRE` = `7`
- `HEDERA_NETWORK` = `testnet` or `mainnet`
- `HEDERA_OPERATOR_ID` = `0.0.xxxxx`
- `HEDERA_OPERATOR_KEY` = `302e020100...`
- `PINATA_JWT` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Optional Variables:**
- `REDIS_URL` = `redis://...` (if using Redis)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (for email)
- `FRONTEND_URL` = `https://your-frontend.vercel.app` (for CORS)

3. After adding all variables, redeploy:
   - Go to **Deployments** → Click the three dots on latest deployment → **Redeploy**

### Step 4: Get Your Backend URL

After deployment, copy your backend URL from Vercel:
- Example: `https://comic-pad-backend.vercel.app`
- Your API will be at: `https://comic-pad-backend.vercel.app/api/v1`

---

## Part 2: Deploy Frontend

### Step 1: Update Frontend API Configuration

The frontend is already configured to use environment variables. Create a `.env.production` file:

```bash
cd frontend
```

Create `frontend/.env.production`:
```env
VITE_API_URL=https://your-backend.vercel.app/api/v1
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
VITE_HEDERA_NETWORK=testnet
```

Replace `your-backend.vercel.app` with your actual backend URL from Step 4 above.

### Step 2: Update Files to Use API Config

You need to update files that hardcode `localhost:3001`. Replace this:
```javascript
const API_BASE = 'http://localhost:3001/api/v1';
```

With this:
```javascript
import API_BASE from '../config/api.js';
```

Files that need updating:
- `src/components/common/NFTActionModal.jsx`
- `src/pages/ComicDetail.jsx`
- `src/pages/CreateComic.jsx`
- `src/pages/Marketplace.jsx`
- Any other files using `localhost:3001`

Or create a quick find-replace script:
```bash
# From frontend directory
find src -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i "s|const API_BASE = 'http://localhost:3001/api/v1'|import API_BASE from '../config/api.js'|g" {} +
```

### Step 3: Deploy Frontend to Vercel

#### Option A: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository (same repo as backend)
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Click "Deploy"

#### Option B: Using Vercel CLI

```bash
cd frontend
vercel
```

### Step 4: Configure Frontend Environment Variables

In the Vercel Dashboard for your frontend project:

1. Go to **Settings** → **Environment Variables**
2. Add these variables:

```
VITE_API_URL = https://your-backend.vercel.app/api/v1
VITE_WALLETCONNECT_PROJECT_ID = your-walletconnect-project-id
VITE_HEDERA_NETWORK = testnet
```

3. Redeploy to apply changes

### Step 5: Update CORS in Backend

After getting your frontend URL, update the backend CORS settings:

1. Go to backend Vercel project → **Settings** → **Environment Variables**
2. Add or update:
   ```
   FRONTEND_URL = https://your-frontend.vercel.app
   ```

3. Update `backend/src/server.js` CORS configuration to use this variable (if not already done):

```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
};
app.use(cors(corsOptions));
```

4. Redeploy backend

---

## Part 3: Verification & Testing

### Test Backend API

Visit your backend URL:
```
https://your-backend.vercel.app/api/v1/health
```

You should see a health check response.

### Test Frontend

Visit your frontend URL:
```
https://your-frontend.vercel.app
```

Test these features:
1. ✅ Page loads correctly
2. ✅ Can connect wallet
3. ✅ Can browse marketplace
4. ✅ Can create collection
5. ✅ Can mint NFTs

### Check Browser Console

Open browser DevTools (F12) and check:
- No CORS errors
- API requests go to your Vercel backend (not localhost)
- WalletConnect initializes correctly

---

## Part 4: Custom Domain (Optional)

### For Frontend

1. Go to frontend project → **Settings** → **Domains**
2. Add your domain (e.g., `comicpad.io`)
3. Follow Vercel's DNS configuration instructions

### For Backend

1. Go to backend project → **Settings** → **Domains**
2. Add API subdomain (e.g., `api.comicpad.io`)
3. Update frontend `.env.production`:
   ```
   VITE_API_URL=https://api.comicpad.io/api/v1
   ```
4. Redeploy frontend

---

## Troubleshooting

### Backend Issues

**Error: MongoDB connection failed**
- Verify `MONGODB_URI` is correct in environment variables
- Ensure MongoDB Atlas allows connections from anywhere (0.0.0.0/0) or add Vercel IPs
- Check MongoDB Atlas user has correct permissions

**Error: Hedera transaction failed**
- Verify `HEDERA_OPERATOR_ID` and `HEDERA_OPERATOR_KEY` are correct
- Ensure operator account has sufficient HBAR balance
- Check you're using correct network (testnet/mainnet)

**Error: IPFS upload failed**
- Verify `PINATA_JWT` is valid and not expired
- Check Pinata account has storage available
- Ensure API key has upload permissions

### Frontend Issues

**Error: Network request failed / CORS error**
- Verify `VITE_API_URL` points to correct backend URL
- Check backend `FRONTEND_URL` environment variable
- Ensure backend CORS is configured correctly

**Wallet connection fails**
- Verify `VITE_WALLETCONNECT_PROJECT_ID` is valid
- Check WalletConnect project is active
- Try clearing browser cache and WalletConnect sessions

**Build fails**
- Check all dependencies are in `package.json`
- Ensure no syntax errors in code
- Review Vercel build logs for specific error

### General Tips

1. **Check Vercel Logs**: Go to **Deployments** → Click deployment → **View Function Logs**
2. **Redeploy**: After changing environment variables, always redeploy
3. **Environment Variable Scopes**: Use "Production", "Preview", and "Development" scopes appropriately
4. **Secrets**: Never commit `.env` files to Git (they're in `.gitignore`)

---

## Continuous Deployment

Once set up, Vercel will automatically:
- Deploy on every push to `main` branch (production)
- Create preview deployments for pull requests
- Provide unique URLs for each deployment

To disable auto-deploy:
1. Project Settings → **Git** → **Ignored Build Step**
2. Add a command that returns exit code 1 to skip builds

---

## Environment Variables Reference

### Backend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `MONGODB_URI` | Yes | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | `random-string-256-bits` |
| `JWT_EXPIRE` | No | JWT expiration time | `7d` |
| `HEDERA_NETWORK` | Yes | Hedera network | `testnet` or `mainnet` |
| `HEDERA_OPERATOR_ID` | Yes | Hedera account ID | `0.0.12345` |
| `HEDERA_OPERATOR_KEY` | Yes | Hedera private key | `302e020100...` |
| `PINATA_JWT` | Yes | Pinata JWT token | `eyJhbGci...` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | `https://app.vercel.app` |
| `REDIS_URL` | No | Redis connection | `redis://...` |

### Frontend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | `https://api.vercel.app/api/v1` |
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect project ID | `abc123...` |
| `VITE_HEDERA_NETWORK` | Yes | Hedera network | `testnet` or `mainnet` |

---

## Post-Deployment Checklist

- [ ] Backend deploys successfully
- [ ] Frontend deploys successfully
- [ ] All environment variables are set
- [ ] MongoDB connection works
- [ ] Hedera transactions work
- [ ] IPFS uploads work
- [ ] Wallet connection works
- [ ] No CORS errors
- [ ] Custom domains configured (if applicable)
- [ ] SSL certificates active
- [ ] Error monitoring set up (optional: Sentry, LogRocket)

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
- [Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)

---

## Support

If you encounter issues:
1. Check Vercel function logs
2. Review browser console errors
3. Test API endpoints directly
4. Verify all environment variables
5. Check MongoDB Atlas, Hedera, and Pinata service status

For Vercel-specific issues, visit [Vercel Support](https://vercel.com/support)
