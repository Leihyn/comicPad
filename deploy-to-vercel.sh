#!/bin/bash

# Comic Pad - Vercel Deployment Script
# This script helps deploy both frontend and backend to Vercel

set -e  # Exit on error

echo "🚀 Comic Pad - Vercel Deployment Helper"
echo "========================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "📦 Install it with: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI is installed"
echo ""

# Function to deploy backend
deploy_backend() {
    echo "📦 Deploying Backend..."
    echo "----------------------"
    cd backend

    if [ ! -f ".env" ]; then
        echo "⚠️  Warning: backend/.env not found"
        echo "📝 Make sure to add environment variables in Vercel Dashboard"
    fi

    echo "🔨 Installing dependencies..."
    npm install

    echo "🚀 Deploying to Vercel..."
    vercel --prod

    echo "✅ Backend deployed!"
    echo ""
    cd ..
}

# Function to deploy frontend
deploy_frontend() {
    echo "🎨 Deploying Frontend..."
    echo "----------------------"
    cd frontend

    if [ ! -f ".env.production" ]; then
        echo "⚠️  Warning: frontend/.env.production not found"
        echo "📝 Creating template..."
        cat > .env.production << EOF
# Update these values with your actual Vercel URLs
VITE_API_URL=https://your-backend.vercel.app/api/v1
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
VITE_HEDERA_NETWORK=testnet
EOF
        echo "⚠️  Please edit frontend/.env.production with your actual values"
        echo "Press Enter to continue after editing..."
        read
    fi

    echo "🔨 Installing dependencies..."
    npm install

    echo "🏗️  Building production bundle..."
    npm run build

    if [ ! -d "dist" ]; then
        echo "❌ Build failed - dist directory not found"
        exit 1
    fi

    echo "🚀 Deploying to Vercel..."
    vercel --prod

    echo "✅ Frontend deployed!"
    echo ""
    cd ..
}

# Main menu
echo "What would you like to deploy?"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both (Backend first, then Frontend)"
echo "4) Exit"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        deploy_backend
        ;;
    2)
        deploy_frontend
        ;;
    3)
        deploy_backend
        deploy_frontend
        ;;
    4)
        echo "👋 Exiting..."
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✨ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Check your Vercel dashboard for deployment URLs"
echo "2. Configure environment variables in Vercel Dashboard"
echo "3. Update frontend .env.production with backend URL"
echo "4. Redeploy frontend if you changed environment variables"
echo ""
echo "📖 For detailed instructions, see VERCEL_DEPLOYMENT_GUIDE.md"
