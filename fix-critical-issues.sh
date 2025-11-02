#!/bin/bash

# Critical Issues Fix Script for pADcomikkk
# Run this script to fix the 3 most critical issues

echo "🔧 pADcomikkk - Critical Issues Fix Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in project root directory. Please run from project root."
    exit 1
fi

echo "=== FIX 1: Remove .env from Git ==="
echo ""

if [ -f "backend/.env" ]; then
    print_warning "Found backend/.env file"

    # Check if .env is tracked by git
    if git ls-files --error-unmatch backend/.env 2>/dev/null; then
        print_info "Removing .env from git tracking..."
        cd backend
        git rm --cached .env
        cd ..
        print_success ".env removed from git tracking"

        print_warning "⚠️  IMPORTANT: You MUST regenerate all secrets in .env!"
        print_info "Generate new JWT secret:"
        echo "  node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
        echo ""
    else
        print_success ".env is not tracked by git"
    fi

    # Check if .gitignore has .env
    if ! grep -q "^\.env$" backend/.gitignore 2>/dev/null; then
        print_info "Adding .env to .gitignore..."
        echo ".env" >> backend/.gitignore
        echo ".env.*" >> backend/.gitignore
        echo "!.env.example" >> backend/.gitignore
        print_success "Added .env to .gitignore"
    else
        print_success ".env already in .gitignore"
    fi

    # Create .env.example if it doesn't exist
    if [ ! -f "backend/.env.example" ]; then
        print_info "Creating .env.example template..."
        cat > backend/.env.example << 'EOF'
# Environment
NODE_ENV=development
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/comicpad

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-CHANGE-THIS
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Hedera
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=your-hedera-account-id
HEDERA_OPERATOR_KEY=your-hedera-private-key

# Pinata (IPFS)
PINATA_JWT=your-pinata-jwt-token

# CORS
FRONTEND_URL=http://localhost:5173

# Bcrypt
BCRYPT_ROUNDS=10

# Logging
LOG_LEVEL=info
EOF
        print_success "Created .env.example"
    fi
else
    print_success "No .env file found in backend/"
fi

echo ""
echo "=== FIX 2: Convert TypeScript Files to JSX ==="
echo ""

# Check for .tsx files
tsx_files=$(find frontend/src -name "*.tsx" 2>/dev/null)

if [ -n "$tsx_files" ]; then
    print_warning "Found TypeScript files:"
    echo "$tsx_files"
    echo ""

    # Convert ComicCard.tsx
    if [ -f "frontend/src/components/ComicCard.tsx" ]; then
        print_info "Converting ComicCard.tsx to ComicCard.jsx..."
        mv frontend/src/components/ComicCard.tsx frontend/src/components/ComicCard.jsx
        print_success "Renamed ComicCard.tsx → ComicCard.jsx"
        print_warning "⚠️  Manual fix needed: Remove TypeScript types from ComicCard.jsx"
    fi

    # Convert SearchFilters.tsx
    if [ -f "frontend/src/components/SearchFilters.tsx" ]; then
        print_info "Converting SearchFilters.tsx to SearchFilters.jsx..."
        mv frontend/src/components/SearchFilters.tsx frontend/src/components/SearchFilters.jsx
        print_success "Renamed SearchFilters.tsx → SearchFilters.jsx"
        print_warning "⚠️  Manual fix needed: Remove TypeScript types from SearchFilters.jsx"
    fi

    # Convert GlobalStyles.tsx
    if [ -f "frontend/src/styles/GlobalStyles.tsx" ]; then
        print_info "Converting GlobalStyles.tsx to GlobalStyles.jsx..."
        mv frontend/src/styles/GlobalStyles.tsx frontend/src/styles/GlobalStyles.jsx
        print_success "Renamed GlobalStyles.tsx → GlobalStyles.jsx"
        print_warning "⚠️  Manual fix needed: Remove TypeScript types from GlobalStyles.jsx"
    fi
else
    print_success "No .tsx files found - already converted"
fi

echo ""
echo "=== FIX 3: Check User Model Duplication ==="
echo ""

if [ -f "backend/src/models/User.js" ] && [ -f "backend/src/models/index.js" ]; then
    # Check if index.js defines User schema
    if grep -q "userSchema" backend/src/models/index.js; then
        print_warning "Duplicate User model found!"
        print_info "backend/src/models/User.js exists"
        print_info "backend/src/models/index.js also defines User schema"
        echo ""
        print_warning "⚠️  MANUAL FIX REQUIRED:"
        echo "  1. Open backend/src/models/index.js"
        echo "  2. Remove the User schema definition"
        echo "  3. Add: import User from './User.js';"
        echo "  4. Update imports in controllers to use: import User from '../models/User.js';"
    else
        print_success "No duplicate User schema found in index.js"
    fi
elif [ -f "backend/src/models/User.js" ]; then
    print_success "User model in User.js - Good!"
else
    print_error "No User model found!"
fi

echo ""
echo "=== Summary ==="
echo ""
print_info "Critical fixes attempted. Please review the warnings above."
echo ""
print_warning "NEXT STEPS:"
echo "1. Regenerate all secrets in backend/.env"
echo "2. Remove TypeScript type annotations from converted .jsx files"
echo "3. Fix User model duplication if detected"
echo "4. Test authentication: npm run dev"
echo "5. Commit changes: git add . && git commit -m 'Fix critical security and code issues'"
echo ""
print_success "Script completed!"
