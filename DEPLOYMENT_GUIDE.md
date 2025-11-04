# 🚀 ComicPad - Vercel Deployment Guide

Complete guide to deploy your ComicPad application to Vercel.

---

## 📋 Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account** - Required for connecting repository
3. **MongoDB Atlas** - For production database
4. **Hedera Account** - Testnet or Mainnet operator account
5. **Pinata Account** - For IPFS storage

---

## 🎯 Deployment Strategy

We'll deploy in this order:
1. **Backend first** (API)
2. **Frontend second** (pointing to deployed backend)

---

## 📦 Part 1: Deploy Backend to Vercel

### Step 1: Prepare Backend for Deployment

The backend is already configured with `vercel.json`. Now push to GitHub:

```bash
cd backend
git init
git add .
git commit -m "Prepare backend for Vercel deployment"
```

### Step 2: Deploy Backend on Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your backend repository
4. Configure build settings:
   - **Framework Preset**: Other
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

### Step 3: Configure Backend Environment Variables

In Vercel dashboard → Settings → Environment Variables, add:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/comicpad?retryWrites=true&w=majority

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Hedera Configuration
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=your-private-key-here

# Pinata (IPFS)
PINATA_JWT=your-pinata-jwt-token

# CORS
CORS_ORIGIN=https://your-frontend-domain.vercel.app

# Node Environment
NODE_ENV=production
PORT=3001
```

### Step 4: Deploy Backend

1. Click **"Deploy"**
2. Wait for deployment to complete
3. Copy your backend URL (e.g., `https://your-backend.vercel.app`)
4. Test the API: `https://your-backend.vercel.app/api/v1/health`

---

## 🎨 Part 2: Deploy Frontend to Vercel

### Step 1: Update API URL in Frontend

Before deploying, update the API URL to point to your deployed backend.

**Option A: Environment Variables (Recommended)**

In `frontend/.env.production`:
```env
VITE_API_URL=https://your-backend.vercel.app/api/v1
```

**Option B: Update All API_BASE Constants**

Find and replace in these files:
- `src/services/marketplaceService.js`
- `src/services/marketplaceHistoryService.js`
- `src/pages/*.jsx` (any file with `API_BASE`)

Change from:
```javascript
const API_BASE = 'http://localhost:3001/api/v1';
```

To:
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'https://your-backend.vercel.app/api/v1';
```

### Step 2: Push Frontend to GitHub

```bash
cd frontend
git init
git add .
git commit -m "Prepare frontend for Vercel deployment"
```

### Step 3: Deploy Frontend on Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your frontend repository
4. Vercel will auto-detect Vite
5. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 4: Configure Frontend Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```env
VITE_API_URL=https://your-backend.vercel.app/api/v1
```

### Step 5: Deploy Frontend

1. Click **"Deploy"**
2. Wait for deployment
3. Your app will be live at `https://your-app.vercel.app`

---

## 🔄 Part 3: Update Backend CORS

After frontend deployment, update backend's CORS settings:

1. Go to Backend project on Vercel
2. Settings → Environment Variables
3. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://your-frontend-app.vercel.app
   ```
4. Redeploy backend (Deployments → Click ⋯ → Redeploy)

---

## ✅ Part 4: Verify Deployment

### Test Backend:
```bash
curl https://your-backend.vercel.app/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "message": "API is running"
}
```

### Test Frontend:
1. Visit `https://your-frontend-app.vercel.app`
2. Check browser console for errors
3. Try connecting wallet
4. Try browsing comics
5. Test marketplace features

---

## 🔧 Common Issues & Solutions

### Issue 1: API Requests Failing
**Solution**: Check CORS settings in backend. Make sure `CORS_ORIGIN` includes your frontend URL.

### Issue 2: Environment Variables Not Working
**Solution**: Make sure they're prefixed with `VITE_` for frontend. Redeploy after adding new env vars.

### Issue 3: MongoDB Connection Error
**Solution**:
- Whitelist Vercel's IP addresses in MongoDB Atlas
- Or use `0.0.0.0/0` (allow all) for network access
- Check connection string is correct

### Issue 4: Build Fails
**Solution**:
- Check Node version compatibility
- Review build logs in Vercel
- Test build locally: `npm run build`

### Issue 5: HashPack Connection Issues
**Solution**: Make sure frontend URL is added to HashPack's allowed origins.

---

## 📱 Part 5: Custom Domain (Optional)

1. Buy a domain (Namecheap, GoDaddy, etc.)
2. In Vercel project → Settings → Domains
3. Add your custom domain
4. Update DNS records as instructed
5. Wait for DNS propagation (5-48 hours)
6. Update `CORS_ORIGIN` in backend

---

## 🔐 Security Checklist

- [ ] All API keys are in environment variables (not in code)
- [ ] CORS is configured to only allow your frontend domain
- [ ] MongoDB has IP whitelist configured
- [ ] JWT secrets are strong (32+ characters)
- [ ] Rate limiting is enabled
- [ ] Helmet middleware is active
- [ ] No sensitive data in git history

---

## 🎉 Post-Deployment

1. **Monitor Logs**: Check Vercel logs for errors
2. **Set up Monitoring**: Use Vercel Analytics
3. **Enable Caching**: Configure caching headers
4. **CDN**: Vercel automatically uses CDN
5. **SSL**: Vercel provides free SSL certificates

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support
- **Check logs in**: Vercel Dashboard → Project → Deployments → View Function Logs

---

## 🚀 Quick Deploy Commands

```bash
# Backend
cd backend
vercel --prod

# Frontend
cd frontend
vercel --prod
```

---

## 📝 Environment Variables Reference

### Backend (.env)
```env
MONGODB_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=
HEDERA_OPERATOR_KEY=
PINATA_JWT=
CORS_ORIGIN=
NODE_ENV=production
```

### Frontend (.env.production)
```env
VITE_API_URL=https://your-backend.vercel.app/api/v1
```

---

## ✨ Success!

Your ComicPad application is now live on Vercel! 🎊

**Next Steps:**
- Share your app URL
- Test all features
- Monitor usage and errors
- Iterate and improve

Happy deploying! 🚀
