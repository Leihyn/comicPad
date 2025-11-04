# Ownership Check Debugging

## Open Browser Console (F12) and check:

1. When you open the action modal, you should see logs like:
```
🎬 NFTActionModal opened with comic: {...}
📊 Comic status: ready
🎨 Comic creator: {...}
📦 Comic NFTs array: [...]
🔢 Number of NFTs: X
💾 Comic minted count: X
```

2. When you click "List on Marketplace", you should see:
```
🔍 Checking ownership for user: [your user ID]
💳 User Hedera Account: [your hedera account]
💳 User Wallet Account: [your wallet account]
📦 Comic NFTs: [...]
🎨 Comic creator: {...}
🆔 Comic creator ID: [creator ID]
👤 Is creator check: {creatorId: '...', userId: '...', isCreator: true/false}
```

## What to check:

**Copy these values from console and send them:**

1. `comic.creator` = ?
2. `user._id` = ?
3. `comic.nfts` = ? (should be an array)
4. `comic.minted` = ? (should be > 0)
5. `user.wallet.accountId` or `user.hederaAccount.accountId` = ?
6. `isCreator` = ? (should be true)

## Expected Flow:

If you're the creator:
- `comic.creator` should equal `user._id`
- `isCreator` should be `true`
- Even if `comic.nfts` is empty, it should still work because `comic.minted > 0`

If you own an NFT:
- `comic.nfts[].owner` should equal your Hedera account ID
- Or `comic.nfts[].owner` should equal `user._id`

## Quick Test Command:

Open browser console and run this:
```javascript
const user = JSON.parse(localStorage.getItem('user'));
console.log('User:', user);
console.log('User ID:', user._id);
console.log('Wallet:', user.wallet?.accountId);
console.log('Hedera Account:', user.hederaAccount?.accountId);
```

Send me the output!
