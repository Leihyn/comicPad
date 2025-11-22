import { useState } from 'react';
import { X, BookOpen, ShoppingCart, Gavel, Gift, Trash2, DollarSign, Calendar } from 'lucide-react';
import Button from './Button';
import axios from 'axios';
import toast from 'react-hot-toast';
import { hashPackWallet } from '../../services/wallets/hashpackClient';
import { TokenId } from '@hashgraph/sdk';

const API_BASE = 'http://localhost:3001/api/v1';

export default function NFTActionModal({ comic, isOpen, onClose, onSuccess }) {
  const [activeAction, setActiveAction] = useState(null);
  const [listingPrice, setListingPrice] = useState('');
  const [auctionStartPrice, setAuctionStartPrice] = useState('');
  const [auctionEndDate, setAuctionEndDate] = useState('');
  const [giftRecipient, setGiftRecipient] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !comic) return null;

  console.log('🎬 NFTActionModal opened with comic:', comic);
  console.log('📊 Comic status:', comic.status);
  console.log('🎨 Comic creator:', comic.creator);
  console.log('📦 Comic NFTs array:', comic.nfts);
  console.log('🔢 Number of NFTs:', comic.nfts?.length || 0);
  console.log('💾 Comic minted count:', comic.minted);

  const isPending = comic.status === 'pending';
  const isPublished = comic.status === 'published' || comic.status === 'ready';

  const handleReadComic = () => {
    // Navigate to reader view
    window.location.href = `/reader/${comic._id}`;
  };

  const handleListOnMarketplace = async () => {
    if (!listingPrice || parseFloat(listingPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Try multiple ways to get user data
      let user = null;
      const userString = localStorage.getItem('user');

      if (userString) {
        try {
          user = JSON.parse(userString);
        } catch (e) {
          console.error('Failed to parse user from localStorage:', e);
        }
      }

      // If not in localStorage, try to fetch from API
      if (!user) {
        console.log('🔍 User not in localStorage, fetching from API...');
        const response = await axios.get(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        user = response.data?.data?.user || response.data?.user || response.data;
        // Store for future use
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Normalize user object - backend may return 'id' or '_id'
      if (user && user.id && !user._id) {
        user._id = user.id;
      }

      if (!user || !user._id) {
        toast.error('User not found. Please login again.');
        console.error('User object:', user);
        return;
      }

      console.log('🔍 Checking ownership for user:', user._id);
      console.log('💳 User Hedera Account:', user.hederaAccount?.accountId);
      console.log('💳 User Wallet Account:', user.wallet?.accountId);
      console.log('📦 Comic NFTs:', comic.nfts);
      console.log('🎨 Comic creator:', comic.creator);
      console.log('🆔 Comic creator ID:', typeof comic.creator === 'object' ? comic.creator?._id : comic.creator);

      // Find an NFT owned by the current user
      // Check THREE ways: user ID, wallet address, OR creator
      const creatorId = typeof comic.creator === 'object' ? comic.creator?._id : comic.creator;
      const isCreator = String(creatorId) === String(user._id);
      const userWallet = user.wallet?.accountId || user.hederaAccount?.accountId;

      console.log('👤 Is creator check:', { creatorId, userId: user._id, isCreator });

      let ownedNFT = comic.nfts?.find(nft => {
        // Method 1: Check by wallet address (most reliable for NFT ownership)
        const nftWallet = nft.owner; // mintedNFTs stores Hedera account as 'owner'
        const walletMatch = userWallet && nftWallet && String(nftWallet) === String(userWallet);

        // Method 2: Check by user ID (for database reference)
        const nftOwnerId = nft.owner?._id || nft.owner;
        const userIdMatch = String(nftOwnerId) === String(user._id);

        console.log(`NFT #${nft.serialNumber}: owner=${nft.owner}, nftOwnerId=${nftOwnerId}`);
        console.log(`  User wallet: ${userWallet}, NFT wallet: ${nftWallet}`);
        console.log(`  User ID match: ${userIdMatch}, Wallet match: ${walletMatch}`);

        return walletMatch || userIdMatch;
      });

      // Method 3: If user is the creator and has minted NFTs, they own ALL of them
      // This handles the case where NFTs were just minted and owner field might not be set yet
      if (!ownedNFT && isCreator && comic.nfts && comic.nfts.length > 0) {
        console.log('✅ User is creator, using first minted NFT');
        ownedNFT = comic.nfts[0];
      }

      if (!ownedNFT) {
        console.error('❌ No owned NFT found');
        console.error('User ID:', user._id);
        console.error('User Wallet:', userWallet);
        console.error('Is Creator:', isCreator);
        console.error('NFTs array:', comic.nfts);

        // More specific and helpful error messages
        if (!comic.nfts || comic.nfts.length === 0) {
          toast.error('No NFTs found for this comic. Please mint some first.');
        } else {
          // Show which accounts own the NFTs
          const nftOwners = comic.nfts.map(nft => nft.owner).join(', ');
          toast.error(`You don't own any NFTs from this comic. Your wallet: ${userWallet}. NFT owners: ${nftOwners}`);

          if (!isCreator) {
            console.warn(`User is not the creator. Creator ID: ${creatorId}, User ID: ${user._id}`);
          }
        }
        return;
      }

      console.log('✅ Found owned NFT:', ownedNFT);

      // Step 1: Get marketplace operator account ID
      console.log('🔍 Fetching marketplace operator account...');
      let operatorAccountId;
      try {
        const operatorResponse = await axios.get(`${API_BASE}/marketplace/operator`);
        operatorAccountId = operatorResponse.data?.data?.operatorAccountId;

        if (!operatorAccountId) {
          throw new Error('Marketplace operator not configured');
        }

        console.log('✅ Marketplace operator:', operatorAccountId);
      } catch (error) {
        console.error('❌ Failed to get marketplace operator:', error);
        toast.error('Failed to get marketplace configuration');
        return;
      }

      // DEMO MODE: Skip NFT approval - operator already owns NFTs
      // In production, you would approve the marketplace to transfer your NFT
      console.log('🎬 DEMO MODE: Skipping NFT approval (operator already owns NFTs)');
      toast.success('Ready to list (demo mode - no approval needed)', { id: 'approve-nft' });

      // Step 2: Create marketplace listing
      console.log('📝 Creating marketplace listing...');
      toast.loading('Creating listing...', { id: 'create-listing' });

      await axios.post(
        `${API_BASE}/marketplace/list`,
        {
          comicId: comic._id,
          serialNumber: ownedNFT.serialNumber,
          price: parseFloat(listingPrice),
          listingType: 'fixed-price'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('✅ Listed on marketplace!\n\nYour NFT is approved for automatic transfer - buyers can purchase instantly!', {
        id: 'create-listing',
        duration: 4000
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to list on marketplace:', error);
      toast.error(error.response?.data?.message || 'Failed to list on marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAuction = async () => {
    if (!auctionStartPrice || parseFloat(auctionStartPrice) <= 0) {
      toast.error('Please enter a valid starting price');
      return;
    }
    if (!auctionEndDate) {
      toast.error('Please select an end date');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Try multiple ways to get user data
      let user = null;
      const userString = localStorage.getItem('user');

      if (userString) {
        try {
          user = JSON.parse(userString);
        } catch (e) {
          console.error('Failed to parse user from localStorage:', e);
        }
      }

      // If not in localStorage, try to fetch from API
      if (!user) {
        console.log('🔍 User not in localStorage, fetching from API...');
        const response = await axios.get(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        user = response.data?.data?.user || response.data?.user || response.data;
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Normalize user object - backend may return 'id' or '_id'
      if (user && user.id && !user._id) {
        user._id = user.id;
      }

      if (!user || !user._id) {
        toast.error('User not found. Please login again.');
        return;
      }

      console.log('🔍 Checking ownership for auction - user:', user._id);
      console.log('💳 User Hedera Account:', user.hederaAccount?.accountId);
      console.log('💳 User Wallet Account:', user.wallet?.accountId);
      console.log('📦 Comic NFTs:', comic.nfts);

      // Find an NFT owned by the current user
      const creatorId = typeof comic.creator === 'object' ? comic.creator?._id : comic.creator;
      const isCreator = String(creatorId) === String(user._id);
      const userWallet = user.wallet?.accountId || user.hederaAccount?.accountId;

      let ownedNFT = comic.nfts?.find(nft => {
        // Check by user ID OR wallet address
        const nftOwnerId = nft.owner?._id || nft.owner;
        const userIdMatch = String(nftOwnerId) === String(user._id);

        const nftWallet = nft.owner; // mintedNFTs stores Hedera account as 'owner'
        const walletMatch = userWallet && nftWallet && String(nftWallet) === String(userWallet);

        return userIdMatch || walletMatch;
      });

      // Creator owns all minted NFTs
      if (!ownedNFT && isCreator && comic.minted > 0) {
        console.log('✅ User is creator, using first NFT for auction');
        ownedNFT = comic.nfts?.[0] || { serialNumber: 1, owner: userWallet };
      }

      if (!ownedNFT) {
        console.error('❌ No owned NFT found for auction');
        toast.error('You do not own any NFT from this comic');
        return;
      }

      console.log('✅ Found owned NFT for auction:', ownedNFT);

      // Step 1: Get marketplace operator account ID
      console.log('🔍 Fetching marketplace operator account...');
      let operatorAccountId;
      try {
        const operatorResponse = await axios.get(`${API_BASE}/marketplace/operator`);
        operatorAccountId = operatorResponse.data?.data?.operatorAccountId;

        if (!operatorAccountId) {
          throw new Error('Marketplace operator not configured');
        }

        console.log('✅ Marketplace operator:', operatorAccountId);
      } catch (error) {
        console.error('❌ Failed to get marketplace operator:', error);
        toast.error('Failed to get marketplace configuration');
        return;
      }

      // DEMO MODE: Skip NFT approval - operator already owns NFTs
      // In production, you would approve the marketplace to transfer your NFT
      console.log('🎬 DEMO MODE: Skipping NFT approval for auction (operator already owns NFTs)');
      toast.success('Ready to start auction (demo mode - no approval needed)', { id: 'approve-nft-auction' });

      // Step 2: Create auction listing
      console.log('📝 Creating auction listing...');
      toast.loading('Starting auction...', { id: 'create-auction' });

      // Calculate auction duration in hours
      const endDate = new Date(auctionEndDate);
      const now = new Date();
      const durationHours = Math.ceil((endDate - now) / (1000 * 60 * 60));

      await axios.post(
        `${API_BASE}/marketplace/list`,
        {
          comicId: comic._id,
          serialNumber: ownedNFT.serialNumber,
          listingType: 'auction',
          auctionDuration: durationHours,
          startingPrice: parseFloat(auctionStartPrice),
          reservePrice: parseFloat(auctionStartPrice)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('✅ Auction started!\n\nYour NFT is approved for automatic transfer - winning bidder can claim instantly!', {
        id: 'create-auction',
        duration: 4000
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to start auction:', error);
      toast.error(error.response?.data?.message || 'Failed to start auction');
    } finally {
      setLoading(false);
    }
  };

  const handleGiftNFT = async () => {
    if (!giftRecipient) {
      toast.error('Please enter recipient address or username');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/comics/${comic._id}/gift`,
        {
          recipient: giftRecipient
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('NFT gifted successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to gift NFT:', error);
      toast.error(error.response?.data?.message || 'Failed to gift NFT');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComic = async () => {
    if (!confirm('Are you sure you want to delete this pending comic? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/comics/${comic._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Comic deleted successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to delete comic:', error);
      toast.error(error.response?.data?.message || 'Failed to delete comic');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-purple-500/50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-purple-500/30 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">{comic.title}</h2>
            <p className="text-sm text-purple-400">Choose an action</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Comic Preview */}
          <div className="mb-6 flex gap-4">
            <img
              src={comic.content?.coverImage || '/placeholder.jpg'}
              alt={comic.title}
              className="w-32 h-48 object-cover rounded-lg border-2 border-purple-500/30"
            />
            <div className="flex-1">
              <p className="text-gray-300 text-sm mb-2">{comic.description}</p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-400">
                  <span className="font-bold text-purple-400">Status:</span>{' '}
                  <span className={`px-2 py-1 rounded text-xs ${
                    isPending ? 'bg-yellow-900/30 text-yellow-400' : 'bg-green-900/30 text-green-400'
                  }`}>
                    {comic.status}
                  </span>
                </p>
                <p className="text-gray-400">
                  <span className="font-bold text-purple-400">Minted:</span> {comic.minted}/{comic.supply}
                </p>
                <p className="text-gray-400">
                  <span className="font-bold text-purple-400">Price:</span> {comic.price} HBAR
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!activeAction && (
            <div className="space-y-3">
              {/* Read Comic - Always available for minted comics */}
              {isPublished && comic.minted > 0 && (
                <button
                  onClick={handleReadComic}
                  className="w-full p-4 bg-blue-900/30 border-2 border-blue-500/50 rounded-xl hover:bg-blue-900/50 transition group text-left"
                >
                  <div className="flex items-center gap-4">
                    <BookOpen className="w-8 h-8 text-blue-400 group-hover:scale-110 transition" />
                    <div>
                      <h3 className="font-bold text-white">Read Comic</h3>
                      <p className="text-sm text-gray-400">Open the comic reader</p>
                    </div>
                  </div>
                </button>
              )}

              {/* List on Marketplace - Only for published comics */}
              {isPublished && (
                <button
                  onClick={() => setActiveAction('list')}
                  className="w-full p-4 bg-purple-900/30 border-2 border-purple-500/50 rounded-xl hover:bg-purple-900/50 transition group text-left"
                >
                  <div className="flex items-center gap-4">
                    <ShoppingCart className="w-8 h-8 text-purple-400 group-hover:scale-110 transition" />
                    <div>
                      <h3 className="font-bold text-white">List on Marketplace</h3>
                      <p className="text-sm text-gray-400">Sell your NFT at a fixed price</p>
                    </div>
                  </div>
                </button>
              )}

              {/* Start Auction - Only for published comics */}
              {isPublished && (
                <button
                  onClick={() => setActiveAction('auction')}
                  className="w-full p-4 bg-pink-900/30 border-2 border-pink-500/50 rounded-xl hover:bg-pink-900/50 transition group text-left"
                >
                  <div className="flex items-center gap-4">
                    <Gavel className="w-8 h-8 text-pink-400 group-hover:scale-110 transition" />
                    <div>
                      <h3 className="font-bold text-white">Start Auction</h3>
                      <p className="text-sm text-gray-400">Let people bid on your NFT</p>
                    </div>
                  </div>
                </button>
              )}

              {/* Gift NFT - Only for published comics */}
              {isPublished && (
                <button
                  onClick={() => setActiveAction('gift')}
                  className="w-full p-4 bg-green-900/30 border-2 border-green-500/50 rounded-xl hover:bg-green-900/50 transition group text-left"
                >
                  <div className="flex items-center gap-4">
                    <Gift className="w-8 h-8 text-green-400 group-hover:scale-110 transition" />
                    <div>
                      <h3 className="font-bold text-white">Gift NFT</h3>
                      <p className="text-sm text-gray-400">Send to another user</p>
                    </div>
                  </div>
                </button>
              )}

              {/* Delete - Only for unminted comics (pending or 0 minted) */}
              {(isPending || comic.minted === 0) && (
                <button
                  onClick={handleDeleteComic}
                  disabled={loading}
                  className="w-full p-4 bg-red-900/30 border-2 border-red-500/50 rounded-xl hover:bg-red-900/50 transition group text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <Trash2 className="w-8 h-8 text-red-400 group-hover:scale-110 transition" />
                    <div>
                      <h3 className="font-bold text-white">Delete Comic</h3>
                      <p className="text-sm text-gray-400">
                        Permanently remove this comic
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* List on Marketplace Form */}
          {activeAction === 'list' && (
            <div className="space-y-4">
              <button
                onClick={() => setActiveAction(null)}
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-2"
              >
                ← Back
              </button>
              <div>
                <label className="block text-sm font-bold text-purple-400 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Listing Price (HBAR)
                </label>
                <input
                  type="number"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  placeholder="Enter price in HBAR"
                  className="w-full px-4 py-3 bg-gray-700 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <Button
                onClick={handleListOnMarketplace}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Listing...' : 'Confirm Listing'}
              </Button>
            </div>
          )}

          {/* Auction Form */}
          {activeAction === 'auction' && (
            <div className="space-y-4">
              <button
                onClick={() => setActiveAction(null)}
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-2"
              >
                ← Back
              </button>
              <div>
                <label className="block text-sm font-bold text-purple-400 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Starting Price (HBAR)
                </label>
                <input
                  type="number"
                  value={auctionStartPrice}
                  onChange={(e) => setAuctionStartPrice(e.target.value)}
                  placeholder="Enter starting bid"
                  className="w-full px-4 py-3 bg-gray-700 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-purple-400 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Auction End Date
                </label>
                <input
                  type="datetime-local"
                  value={auctionEndDate}
                  onChange={(e) => setAuctionEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <Button
                onClick={handleStartAuction}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Starting...' : 'Start Auction'}
              </Button>
            </div>
          )}

          {/* Gift Form */}
          {activeAction === 'gift' && (
            <div className="space-y-4">
              <button
                onClick={() => setActiveAction(null)}
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-2"
              >
                ← Back
              </button>
              <div>
                <label className="block text-sm font-bold text-purple-400 mb-2">
                  <Gift className="w-4 h-4 inline mr-1" />
                  Recipient (Username or Hedera Account ID)
                </label>
                <input
                  type="text"
                  value={giftRecipient}
                  onChange={(e) => setGiftRecipient(e.target.value)}
                  placeholder="@username or 0.0.xxxxx"
                  className="w-full px-4 py-3 bg-gray-700 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <Button
                onClick={handleGiftNFT}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Send Gift'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
