# 🛍️ Marketplace Instructions

## Current Status: P2P Marketplace (Manual NFT Transfer)

### **Why NFTs Don't Auto-Transfer**

Hedera blockchain requires **BOTH seller and buyer** to sign NFT transfer transactions. Your marketplace currently:
- ✅ Shows listings correctly
- ✅ Collects payment from buyer
- ❌ Cannot auto-transfer NFT (needs seller signature)

### **Current Workflow**

1. **Buyer clicks "Buy Now"**
   - Associates the token (first time only)
   - Sends HBAR payment to seller ✅
   - Transaction completes

2. **Seller must manually transfer NFT**
   - Check your wallet for received HBAR
   - Open HashPack
   - Send the NFT to the buyer's wallet address
   - OR use the admin panel (coming soon)

### **Solutions to Implement**

#### **Option 1: NFT Allowances (Recommended)**
When listing an NFT:
```javascript
// Seller approves marketplace contract to transfer NFT
AccountAllowanceApproveTransaction()
  .approveTokenNftAllowanceAllSerials(tokenId, ownerAccount, spenderAccount)
  .execute()
```

Then buyer can complete the transfer without seller's signature.

#### **Option 2: Atomic Swap Smart Contract**
- Deploy a Hedera smart contract
- Seller deposits NFT into escrow
- Buyer sends payment
- Contract auto-transfers NFT

#### **Option 3: Multi-Signature Transaction**
- Buyer creates transaction
- Transaction sent to seller
- Seller signs and submits
- Requires coordination/messaging system

#### **Option 4: Custodial Marketplace**
- Backend holds NFTs in custody
- Instant transfers
- Less decentralized

### **For Auctions/Bidding**

Bidding works differently:
- ✅ Users can place bids (just database records)
- ❌ Winning bidder still needs manual NFT transfer from seller

### **Immediate Action Needed**

If someone bought your NFT:
1. Check your wallet for received HBAR payment
2. Note the buyer's wallet address
3. Open HashPack
4. Transfer the NFT manually to the buyer

### **Recommended Next Steps**

1. **Implement NFT Allowances** (easiest automated solution)
2. **Add seller dashboard** to see purchases and transfer NFTs easily
3. **Add transaction history** to track which NFTs need to be sent

Would you like me to implement **NFT Allowances** (Option 1) for automatic transfers?
