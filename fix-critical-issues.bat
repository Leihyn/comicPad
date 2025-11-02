@echo off
REM Critical Issues Fix Script for pADcomikkk (Windows)
REM Run this script to fix the 3 most critical issues

echo ========================================
echo pADcomikkk - Critical Issues Fix Script
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Not in project root directory. Please run from project root.
    exit /b 1
)

echo === FIX 1: Remove .env from Git ===
echo.

if exist "backend\.env" (
    echo [WARNING] Found backend\.env file

    REM Check if .env is tracked by git
    git ls-files --error-unmatch backend\.env >nul 2>&1
    if %errorlevel% equ 0 (
        echo [INFO] Removing .env from git tracking...
        cd backend
        git rm --cached .env
        cd ..
        echo [SUCCESS] .env removed from git tracking
        echo.
        echo [WARNING] IMPORTANT: You MUST regenerate all secrets in .env!
        echo [INFO] Generate new JWT secret with:
        echo   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
        echo.
    ) else (
        echo [SUCCESS] .env is not tracked by git
    )

    REM Check if .gitignore has .env
    findstr /C:".env" backend\.gitignore >nul 2>&1
    if %errorlevel% neq 0 (
        echo [INFO] Adding .env to .gitignore...
        echo .env>> backend\.gitignore
        echo .env.*>> backend\.gitignore
        echo !.env.example>> backend\.gitignore
        echo [SUCCESS] Added .env to .gitignore
    ) else (
        echo [SUCCESS] .env already in .gitignore
    )

    REM Create .env.example if it doesn't exist
    if not exist "backend\.env.example" (
        echo [INFO] Creating .env.example template...
        (
            echo # Environment
            echo NODE_ENV=development
            echo PORT=3001
            echo.
            echo # Database
            echo MONGODB_URI=mongodb://localhost:27017/comicpad
            echo.
            echo # JWT
            echo JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-CHANGE-THIS
            echo JWT_EXPIRE=7d
            echo JWT_REFRESH_EXPIRE=30d
            echo.
            echo # Hedera
            echo HEDERA_NETWORK=testnet
            echo HEDERA_OPERATOR_ID=your-hedera-account-id
            echo HEDERA_OPERATOR_KEY=your-hedera-private-key
            echo.
            echo # Pinata (IPFS^)
            echo PINATA_JWT=your-pinata-jwt-token
            echo.
            echo # CORS
            echo FRONTEND_URL=http://localhost:5173
            echo.
            echo # Bcrypt
            echo BCRYPT_ROUNDS=10
            echo.
            echo # Logging
            echo LOG_LEVEL=info
        ) > backend\.env.example
        echo [SUCCESS] Created .env.example
    )
) else (
    echo [SUCCESS] No .env file found in backend\
)

echo.
echo === FIX 2: Convert TypeScript Files to JSX ===
echo.

REM Check for .tsx files
set tsx_found=0

if exist "frontend\src\components\ComicCard.tsx" (
    set tsx_found=1
    echo [INFO] Converting ComicCard.tsx to ComicCard.jsx...
    move "frontend\src\components\ComicCard.tsx" "frontend\src\components\ComicCard.jsx"
    echo [SUCCESS] Renamed ComicCard.tsx to ComicCard.jsx
    echo [WARNING] Manual fix needed: Remove TypeScript types from ComicCard.jsx
    echo.
)

if exist "frontend\src\components\SearchFilters.tsx" (
    set tsx_found=1
    echo [INFO] Converting SearchFilters.tsx to SearchFilters.jsx...
    move "frontend\src\components\SearchFilters.tsx" "frontend\src\components\SearchFilters.jsx"
    echo [SUCCESS] Renamed SearchFilters.tsx to SearchFilters.jsx
    echo [WARNING] Manual fix needed: Remove TypeScript types from SearchFilters.jsx
    echo.
)

if exist "frontend\src\styles\GlobalStyles.tsx" (
    set tsx_found=1
    echo [INFO] Converting GlobalStyles.tsx to GlobalStyles.jsx...
    move "frontend\src\styles\GlobalStyles.tsx" "frontend\src\styles\GlobalStyles.jsx"
    echo [SUCCESS] Renamed GlobalStyles.tsx to GlobalStyles.jsx
    echo [WARNING] Manual fix needed: Remove TypeScript types from GlobalStyles.jsx
    echo.
)

if %tsx_found% equ 0 (
    echo [SUCCESS] No .tsx files found - already converted
)

echo.
echo === FIX 3: Check User Model Duplication ===
echo.

if exist "backend\src\models\User.js" (
    if exist "backend\src\models\index.js" (
        findstr /C:"userSchema" backend\src\models\index.js >nul 2>&1
        if %errorlevel% equ 0 (
            echo [WARNING] Duplicate User model found!
            echo [INFO] backend\src\models\User.js exists
            echo [INFO] backend\src\models\index.js also defines User schema
            echo.
            echo [WARNING] MANUAL FIX REQUIRED:
            echo   1. Open backend\src\models\index.js
            echo   2. Remove the User schema definition
            echo   3. Add: import User from './User.js';
            echo   4. Update imports in controllers to use: import User from '../models/User.js';
        ) else (
            echo [SUCCESS] No duplicate User schema found in index.js
        )
    ) else (
        echo [SUCCESS] User model in User.js - Good!
    )
) else (
    echo [ERROR] No User model found!
)

echo.
echo === Summary ===
echo.
echo [INFO] Critical fixes attempted. Please review the warnings above.
echo.
echo [WARNING] NEXT STEPS:
echo 1. Regenerate all secrets in backend\.env
echo 2. Remove TypeScript type annotations from converted .jsx files
echo 3. Fix User model duplication if detected
echo 4. Test authentication: npm run dev
echo 5. Commit changes: git add . ^&^& git commit -m "Fix critical security and code issues"
echo.
echo [SUCCESS] Script completed!
echo.
pause
