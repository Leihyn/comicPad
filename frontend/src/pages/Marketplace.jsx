import { useState, useEffect, useContext } from 'react';
import { WalletConnectContext } from '../contexts/WalletConnectContext';
import { openHashPackModal, hashPackWallet } from '../services/wallets/hashpackClient';
import { ShoppingCart, Gavel, Wallet as WalletIcon, Filter, TrendingUp, Clock, DollarSign, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import marketplaceService from '../services/marketplaceService';
import toast from 'react-hot-toast';
import { Hbar, TokenId, AccountId, TransferTransaction } from '@hashgraph/sdk';

export default function Marketplace() {
  const { isConnected } = useContext(WalletConnectContext);
  const [connecting, setConnecting] = useState(false);
  const [listings, setListings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedListing, setSelectedListing] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [stats, setStats] = useState({
    activeAuctions: 0,
    totalVolume: 0,
    floorPrice: 0,
    totalListings: 0
  });

  useEffect(() => {
    loadListings();
    loadStats();
  }, [filter, sortBy]);

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/v1/stats/marketplace');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load marketplace stats:', error);
    }
  };

  const connectWallet = async () => {
    setConnecting(true);
    try {
      await openHashPackModal();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setConnecting(false);
    }
  };

  const loadListings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.listingType = filter;
      if (sortBy === 'price-low') params.sortBy = 'price';
      if (sortBy === 'price-high') params.sortBy = 'price';
      if (sortBy === 'price-high') params.order = 'desc';
      if (sortBy === 'newest') params.sortBy = 'createdAt';

      console.log('📡 Loading listings with params:', params);
      const listings = await marketplaceService.getListings(params);
      console.log('✅ Loaded listings:', listings);
      setListings(Array.isArray(listings) ? listings : []);
    } catch (error) {
      console.error('❌ Load listings error:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyClick = (listing) => {
    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const handleBidClick = (listing) => {
    setSelectedListing(listing);
    setShowBidModal(true);
  };

  const handleBuyNFT = async () => {
    if (!selectedListing) return;

    try {
      // Check if wallet is connected
      if (!hashPackWallet.isConnected()) {
        toast.error('Please connect your wallet first', { id: 'buy-nft' });
        return;
      }

      // Validate listing data
      if (!selectedListing.sellerAccountId) {
        toast.error('Invalid listing: missing seller account ID', { id: 'buy-nft' });
        console.error('Listing missing sellerAccountId:', selectedListing);
        return;
      }

      const tokenIdString = selectedListing.tokenId;
      if (!tokenIdString) {
        toast.error('Invalid listing: missing token ID', { id: 'buy-nft' });
        console.error('Listing missing tokenId:', selectedListing);
        return;
      }

      toast.loading('Preparing purchase transaction...', { id: 'buy-nft' });

      // Get listing details
      const sellerAccountId = AccountId.fromString(selectedListing.sellerAccountId);
      const tokenId = TokenId.fromString(tokenIdString);
      const serialNumber = selectedListing.serialNumber;
      // Ensure price is a valid integer for Hbar
      const priceValue = typeof selectedListing.price === 'object'
        ? Math.floor(parseFloat(selectedListing.price.amount))
        : Math.floor(parseFloat(selectedListing.price));
      const price = new Hbar(priceValue);

      console.log('💰 Purchasing NFT:', {
        tokenId: tokenId.toString(),
        serialNumber,
        seller: sellerAccountId.toString(),
        price: price.toString()
      });

      // Use the built-in transferNFT method
      toast.loading('Opening HashPack to approve purchase...', { id: 'buy-nft' });

      const transactionId = await hashPackWallet.transferNFT(
        sellerAccountId,
        tokenId,
        serialNumber,
        price
      );

      console.log('✅ Purchase transaction executed:', transactionId.toString());
      toast.loading('Confirming purchase on blockchain...', { id: 'buy-nft' });

      // Step 2: Backend handles NFT transfer and database update
      toast.loading('Updating ownership records...', { id: 'buy-nft' });
      await marketplaceService.buyNFT(selectedListing._id, {
        paymentTransactionId: transactionId.toString(),
        status: 'SUCCESS'
      });

      toast.success('NFT purchased successfully! 🎉', { id: 'buy-nft' });
      setShowBuyModal(false);
      loadListings();
    } catch (error) {
      console.error('Buy NFT error:', error);
      toast.error(error.message || error.response?.data?.message || 'Failed to buy NFT', { id: 'buy-nft' });
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedListing || !bidAmount) {
      toast.error('Please enter a bid amount');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (amount <= selectedListing.auction?.currentBid || 0) {
      toast.error(`Bid must be higher than ${selectedListing.auction?.currentBid || 0} HBAR`);
      return;
    }

    try {
      toast.loading('Placing bid...', { id: 'place-bid' });

      await marketplaceService.placeBid(selectedListing._id, amount);

      toast.success('Bid placed successfully! 🎉', { id: 'place-bid' });
      setShowBidModal(false);
      setBidAmount('');
      loadListings(); // Refresh listings
    } catch (error) {
      console.error('Place bid error:', error);
      toast.error(error.response?.data?.message || 'Failed to place bid', { id: 'place-bid' });
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl md:text-7xl font-comic text-comic-yellow mb-4 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
          MARKETPLACE! 💰
        </h1>
        <p className="text-xl text-gray-400 font-bold">
          Buy, sell, and trade epic comic book NFTs!
        </p>
      </div>

      {/* Connect Wallet Banner */}
      {!isConnected && (
        <div className="mb-8 comic-panel p-8 bg-gradient-to-r from-comic-red/20 to-comic-orange/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-comic text-comic-yellow mb-2">CONNECT YOUR WALLET! 🔗</h3>
            <p className="text-gray-400">Link your HashPack wallet to start trading comics</p>
          </div>
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="btn-comic flex items-center gap-2 whitespace-nowrap"
          >
            <WalletIcon className="w-5 h-5" />
            {connecting ? 'Connecting...' : 'Connect HashPack'}
          </button>
        </div>
      )}

      {/* Filters & Sort */}
      <div className="mb-8 flex flex-col md:flex-row gap-4 justify-between">
        {/* Type Filters */}
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'all', label: 'All Listings', icon: '📚' },
            { id: 'fixed-price', label: 'Buy Now', icon: '💳' },
            { id: 'auction', label: 'Auctions', icon: '🔨' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-6 py-3 rounded-xl font-bold uppercase transition transform hover:scale-105 ${
                filter === f.id
                  ? 'bg-gradient-to-r from-comic-yellow to-comic-orange text-dark-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]'
                  : 'bg-dark-800 text-gray-400 border-2 border-dark-600 hover:border-comic-yellow hover:text-white'
              }`}
            >
              <span className="mr-2">{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-6 py-3 bg-dark-800 border-2 border-dark-600 rounded-xl text-white font-bold uppercase focus:outline-none focus:border-comic-yellow cursor-pointer"
        >
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Listings', value: stats.totalListings, icon: '📊' },
          { label: 'Active Auctions', value: stats.activeAuctions, icon: '⏰' },
          { label: 'Total Volume', value: `${stats.totalVolume} HBAR`, icon: '💎' },
          { label: 'Floor Price', value: `${stats.floorPrice} HBAR`, icon: '📉' }
        ].map((stat, i) => (
          <div key={i} className="comic-panel p-4 text-center">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-comic text-comic-yellow">{stat.value}</div>
            <div className="text-xs text-gray-500 uppercase font-bold">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] bg-dark-800 rounded-xl animate-pulse border-4 border-dark-700"
            />
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="grid md:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing._id}
              listing={listing}
              isConnected={isConnected}
              onBuy={handleBuyClick}
              onBid={handleBidClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-8xl mb-6">🛒</div>
          <h3 className="text-3xl font-comic text-comic-yellow mb-4">NO LISTINGS YET!</h3>
          <p className="text-xl text-gray-400 mb-8">Be the first to list a comic for sale!</p>
          {isConnected && (
            <Link to="/profile" className="btn-comic">
              LIST YOUR COMICS 🚀
            </Link>
          )}
        </div>
      )}

      {/* Buy Modal */}
      {showBuyModal && selectedListing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border-4 border-comic-yellow rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b-4 border-comic-yellow/30">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-comic text-comic-yellow">BUY NFT!</h2>
                <button onClick={() => setShowBuyModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-4 mb-4">
                <img
                  src={selectedListing.metadata?.imageUrl || selectedListing.episode?.content?.coverImage?.url || selectedListing.comic?.content?.coverImage}
                  alt={selectedListing.metadata?.title || selectedListing.episode?.title || selectedListing.comic?.title}
                  className="w-32 h-48 object-cover rounded-xl flex-shrink-0"
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {selectedListing.metadata?.title || selectedListing.episode?.title || selectedListing.comic?.title}
                  </h3>
                  <p className="text-gray-400 mb-4">Serial #{selectedListing.serialNumber}</p>

                  <div className="bg-dark-700 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-1">PRICE</div>
                    <div className="text-4xl font-comic text-comic-yellow">
                      {typeof selectedListing.price === 'object' ? selectedListing.price.amount : selectedListing.price} HBAR
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleBuyNFT}
                className="w-full py-4 bg-gradient-to-r from-comic-green to-comic-cyan text-dark-900 rounded-xl font-black text-xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1 transition"
              >
                CONFIRM PURCHASE 🎉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bid Modal */}
      {showBidModal && selectedListing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border-4 border-comic-purple rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b-4 border-comic-purple/30">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-comic text-comic-purple">PLACE BID!</h2>
                <button onClick={() => setShowBidModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-4 mb-4">
                <img
                  src={selectedListing.metadata?.imageUrl || selectedListing.episode?.content?.coverImage?.url || selectedListing.comic?.content?.coverImage}
                  alt={selectedListing.metadata?.title || selectedListing.episode?.title || selectedListing.comic?.title}
                  className="w-32 h-48 object-cover rounded-xl flex-shrink-0"
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {selectedListing.metadata?.title || selectedListing.episode?.title || selectedListing.comic?.title}
                  </h3>
                  <p className="text-gray-400 mb-4">Serial #{selectedListing.serialNumber}</p>

                  <div className="bg-dark-700 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-1">CURRENT BID</div>
                    <div className="text-3xl font-comic text-comic-purple">{selectedListing.auction?.currentBid || 0} HBAR</div>
                    <div className="text-xs text-gray-500 mt-1">{selectedListing.auction?.bids?.length || 0} bids</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-comic-purple mb-2 uppercase">Your Bid (HBAR)</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Min: ${(selectedListing.auction?.currentBid || 0) + 1}`}
                  className="w-full px-4 py-3 bg-dark-700 border-2 border-comic-purple/30 rounded-xl text-white text-xl font-bold focus:border-comic-purple focus:outline-none"
                />
              </div>

              <button
                onClick={handlePlaceBid}
                className="w-full py-4 bg-gradient-to-r from-comic-purple to-comic-pink text-white rounded-xl font-black text-xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1 transition"
              >
                PLACE BID 🔨
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing, isConnected, onBuy, onBid }) {
  // Extract image URL from various possible locations
  const imageUrl = listing.metadata?.imageUrl ||
                   listing.episode?.content?.coverImage?.url ||
                   listing.episode?.content?.coverImage?.ipfsHash ||
                   listing.comic?.content?.coverImage?.url ||
                   listing.comic?.content?.coverImage ||
                   'https://via.placeholder.com/400x600/1a1a1a/0066FF?text=COMIC';

  // Extract title from various possible locations
  const title = listing.metadata?.title || listing.episode?.title || listing.comic?.title || 'Untitled Comic';

  // Extract price - can be either listing.price or listing.price.amount
  const price = typeof listing.price === 'object' ? listing.price.amount : listing.price;

  console.log('🎨 Rendering listing card:', {
    id: listing._id,
    title,
    price,
    imageUrl,
    listingType: listing.listingType,
    rawListing: listing
  });

  return (
    <div className="comic-card group">
      {/* Cover Image */}
      <div className="aspect-[2/3] relative overflow-hidden bg-gradient-to-br from-comic-blue/30 to-comic-purple/30">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />
        
        {/* Listing Type Badge */}
        {listing.listingType === 'auction' && (
          <div className="absolute top-3 left-3 px-3 py-2 bg-comic-purple text-white rounded-lg font-bold text-sm uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2">
            <Gavel className="w-4 h-4" />
            AUCTION
          </div>
        )}
        
        {/* Time Remaining (for auctions) */}
        {listing.listingType === 'auction' && listing.auction?.endTime && (
          <div className="absolute top-3 right-3 px-3 py-2 bg-comic-red text-white rounded-lg font-bold text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            2d 5h
          </div>
        )}
        
        {/* Price Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1 uppercase font-bold">
                {listing.listingType === 'auction' ? 'Current Bid' : 'Price'}
              </div>
              <div className="text-3xl font-comic text-comic-yellow">
                {price} HBAR
              </div>
            </div>
            {listing.listingType === 'auction' && (
              <div className="text-xs text-gray-400">
                <div>{listing.auction?.bids?.length || 0} bids</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Listing Info */}
      <div className="p-4 bg-dark-800">
        <h3 className="font-bold text-lg mb-1 text-white group-hover:text-comic-yellow transition truncate">
          {title}
        </h3>
        <p className="text-sm text-gray-400 mb-3">
          by {listing.seller?.username || listing.seller?.profile?.displayName || 'Unknown'}
        </p>
        
        {/* Action Button */}
        {isConnected ? (
          <button
            onClick={() => listing.listingType === 'auction' ? onBid(listing) : onBuy(listing)}
            className="w-full py-3 bg-gradient-to-r from-comic-green to-comic-cyan text-dark-900 rounded-lg font-bold uppercase hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            {listing.listingType === 'auction' ? (
              <>
                <Gavel className="w-5 h-5" />
                Place Bid
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Buy Now
              </>
            )}
          </button>
        ) : (
          <div className="text-center text-xs text-gray-500 py-2 font-bold uppercase">
            Connect wallet to trade
          </div>
        )}
      </div>
    </div>
  );
}