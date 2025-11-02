#PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5ZDQ1NWQ5Zi02MjI4LTQxYjAtYTU3MS0yNzRlYmRlOTkwMGEiLCJlbWFpbCI6Im9uYXRvbGFmYXJ1cUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMWQwZTIyYjM0MGY3NmM0MGFkY2YiLCJzY29wZWRLZXlTZWNyZXQiOiJhNGY1MWIwYjcyZmNkN2UyYzBiNGJmZTQ1MWI1OGYwNzA2Y2ZjZTcwZjhlNWY3Y2VmZTcwNzY3OTUwZmE0ODk3IiwiZXhwIjoxNzkzMzIxMTkzfQ.0Kw5Ac8clQA4y8bMcBBIVSnb26mWDe9M1JHtfscSVIo


#MONGODB_URI=mongodb+srv://onatolafaruq_db_user:tzdDsGFQdoYm9aRF@hederapad.e5wmol7.mongodb.net/?appName=hederaPad


#NODE_ENV=development
#PORT=3001
#FRONTEND_URL=http://localhost:3000


#JWT_SECRET=comic-pad-super-secret-jwt-key-change-in-production-minimum-32-characters
#JWT_EXPIRE=7d
#JWT_REFRESH_SECRET=comic-pad-refresh-secret-also-change-in-production-minimum-32-characters
#JWT_REFRESH_EXPIRE=30d


BCRYPT_ROUNDS=10

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800

PLATFORM_FEE_PERCENTAGE=2.5

RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100


#HEDERA_NETWORK=testnet
###HEDERA_PUBLIC_KEY=302a300506032b6570032100eb46a54f08d2e324bedd7648c3642a7287acbfaa53f7ed97e65d9e5b92bc883b
# ========================================
# HEDERA (Optional - for NFT minting)
# ========================================
# Get FREE testnet account: https://portal.hedera.com/register
#HEDERA_NETWORK=testnet
#HEDERA_OPERATOR_ID=0.0.7152812
#HEDERA_OPERATOR_KEY=302e020100300506032b65700422042070df653523252f5cb73945022137ccc61107a7fb606cf5a4d8d3b0a52e0bb1d3
# --- Hedera Configuration ---
#HEDERA_NETWORK=testnet
#HEDERA_ACCOUNT_ID=0.0.7152812
#HEDERA_PRIVATE_KEY=302e020100300506032b65700422042070df653523252f5cb73945022137ccc61107a7fb606cf5a4d8d3b0a52e0bb1d3
#HEDERA_PUBLIC_KEY=302a300506032b6570032100eb46a54f08d2e324bedd7648c3642a7287acbfaa53f7ed97e65d9e5b92bc883b

HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.7152812
HEDERA_OPERATOR_KEY=302e020100300506032b65700422042070df653523252f5cb73945022137ccc61107a7fb606cf5a4d8d3b0a52e0bb1d3
HEDERA_PUBLIC_KEY=302a300506032b6570032100eb46a54f08d2e324bedd7648c3642a7287acbfaa53f7ed97e65d9e5b92bc883b
# Example when you have credentials:
# HEDERA_OPERATOR_ID=0.0.12345678
# HEDERA_OPERATOR_KEY=302e020100300506032b657004220420...

# ========================================
# PINATA / IPFS (Optional - for file storage)
# ========================================
# Get FREE account: https://app.pinata.cloud
# Create API Key and copy JWT token
# PINATA_JWT=

# Example when you have JWT:
# PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ========================================
# REDIS (Optional - for caching)
# ========================================
REDIS_URL=
REDIS_PASSWORD=


EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=noreply@comicpad.io
