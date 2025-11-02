# Quick Deployment Guide

## Prerequisites

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

## Quick Deploy Steps

### 1. Deploy Backend (5 minutes)

```bash
cd backend
vercel
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- Project name? **comic-pad-backend**
- Directory? **./backend**
- Override settings? **No**

After deployment:
1. Copy your backend URL (e.g., `https://comic-pad-backend.vercel.app`)
2. Go to Vercel Dashboard → Project Settings → Environment Variables
3. Add all variables from `backend/.env.example`
4. Redeploy: `vercel --prod`

### 2. Deploy Frontend (5 minutes)

```bash
cd frontend

# Create production environment file
cat > .env.production << EOF
VITE_API_URL=https://your-backend.vercel.app/api/v1
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
VITE_HEDERA_NETWORK=testnet
EOF

# Deploy
vercel
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- Project name? **comic-pad-frontend**
- Directory? **./frontend**
- Override settings? **No**

After deployment:
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add variables from `.env.production`
3. Redeploy: `vercel --prod`

### 3. Update CORS

1. Go to backend project on Vercel
2. Add environment variable:
   ```
   FRONTEND_URL = https://your-frontend.vercel.app
   ```
3. Redeploy backend: `vercel --prod`

## Done! 🎉

Visit your frontend URL and test the application.

## Common Commands

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# View logs
vercel logs

# List deployments
vercel ls

# Remove project
vercel remove
```

## Need Help?

See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for detailed instructions.
