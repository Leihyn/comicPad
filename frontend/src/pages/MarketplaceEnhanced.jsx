import { useState, useEffect, useContext } from 'react';
import { WalletConnectContext } from '../contexts/WalletConnectContext';
import { openHashPackModal, hashPackWallet } from '../services/wallets/hashpackClient';
import { ShoppingCart, Gavel, Wallet as WalletIcon, Filter, TrendingUp, Clock, DollarSign, X, Star, Flame, Eye, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import marketplaceService from '../services/marketplaceService';
import toast from 'react-hot-toast';
import { Hbar, TokenId, AccountId } from '@hashgraph/sdk';

export default function MarketplaceEnhanced() {
  console.log('🎨 MarketplaceEnhanced component rendering!');

  const { isConnected } = useContext(WalletConnectContext);
  const [connecting, setConnecting] = useState(false);
  const [listings, setListings] = useState([]);
  const [featuredListings, setFeaturedListings] = useState([]);
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
    console.log('🚀 MarketplaceEnhanced useEffect triggered!');
    loadListings();
    loadStats();
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
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
    console.log('🔄 loadListings called with filter:', filter, 'sortBy:', sortBy);
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.listingType = filter;
      if (sortBy === 'price-low') params.sortBy = 'price';
      if (sortBy === 'price-high') params.sortBy = 'price';
      if (sortBy === 'price-high') params.order = 'desc';
      if (sortBy === 'newest') params.sortBy = 'createdAt';

      console.log('📡 Loading listings with params:', params);
      const allListings = await marketplaceService.getListings(params);
      console.log('✅ Loaded listings:', allListings);
      console.log('✅ Listings count:', allListings?.length);
      console.log('✅ Is array?', Array.isArray(allListings));

      if (Array.isArray(allListings) && allListings.length > 0) {
        console.log('📚 Setting listings state with', allListings.length, 'items');
        setListings(allListings);
        setFeaturedListings(allListings.slice(0, 3));
        console.log('✨ Featured listings set:', allListings.slice(0, 3).length);
      } else {
        console.warn('⚠️ No listings or invalid format');
        setListings([]);
        setFeaturedListings([]);
      }
    } catch (error) {
      console.error('❌ Load listings error:', error);
      console.error('❌ Error details:', error.message, error.stack);
      setListings([]);
      setFeaturedListings([]);
    } finally {
      setLoading(false);
      console.log('✅ Loading complete, loading state:', false);
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
      if (!hashPackWallet.isConnected()) {
        toast.error('Please connect your wallet first', { id: 'buy-nft' });
        return;
      }

      const price = selectedListing.price?.amount || 0;
      const sellerAccountId = AccountId.fromString(selectedListing.sellerAccountId);
      const tokenId = TokenId.fromString(selectedListing.tokenId);
      const serialNumber = selectedListing.serialNumber;

      console.log('🛒 Starting atomic purchase transaction:', {
        price,
        seller: sellerAccountId.toString(),
        tokenId: tokenId.toString(),
        serialNumber
      });

      toast.loading('Processing purchase... (Payment + NFT Transfer)', { id: 'buy-nft' });

      // Execute atomic transaction: Payment + NFT Transfer in ONE transaction
      // This uses the seller's allowance that was granted when they listed the NFT
      const txResult = await hashPackWallet.transferNFT(
        sellerAccountId,
        tokenId,
        serialNumber,
        Hbar.from(price)
      );

      console.log('✅ Atomic transaction completed:', txResult);

      toast.loading('Updating marketplace records...', { id: 'buy-nft' });

      // Step 2: Call backend to update the database
      const result = await marketplaceService.buyNFT(selectedListing._id, {
        paymentTransactionId: txResult.toString()
      });

      console.log('✅ Purchase completed:', result);

      toast.success(`NFT purchased successfully! 🎉\n\nPaid ${price} HBAR\nNFT transferred to your wallet!`, {
        id: 'buy-nft',
        duration: 5000
      });

      setShowBuyModal(false);

      // Reload listings after a short delay
      setTimeout(() => {
        loadListings();
        loadStats();
      }, 2000);
    } catch (error) {
      console.error('Buy NFT error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to buy NFT';
      toast.error(`Failed to buy NFT: ${errorMessage}`, { id: 'buy-nft', duration: 8000 });
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
      loadListings();
      loadStats();
    } catch (error) {
      console.error('Place bid error:', error);
      toast.error(error.response?.data?.message || 'Failed to place bid', { id: 'place-bid' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900">
      {/* Hero Header - Comic Store Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-comic-purple via-comic-blue to-comic-cyan py-20 mb-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`
          }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center">
            <div className="inline-block mb-6">
              <div className="text-8xl md:text-9xl font-comic text-white drop-shadow-[0_8px_0px_rgba(0,0,0,0.8)] animate-pulse">
                COMIC SHOP
              </div>
              <div className="text-2xl md:text-3xl font-bold text-comic-yellow mt-4 tracking-widest">
                ⚡ COLLECT • TRADE • OWN ⚡
              </div>
            </div>

            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-bold">
              Your favorite comics as NFTs! Buy instantly or bid in live auctions!
            </p>

            {/* History Link */}
            <div className="mt-6">
              <Link
                to="/marketplace/history"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur border-2 border-white/30 text-white font-semibold rounded-xl transition-all"
              >
                <Clock className="w-5 h-5" />
                View Transaction History
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative comic elements */}
        <div className="absolute top-10 left-10 text-6xl opacity-20 animate-bounce">💥</div>
        <div className="absolute bottom-10 right-10 text-6xl opacity-20 animate-bounce" style={{animationDelay: '0.5s'}}>⭐</div>
      </div>

      <div className="container mx-auto px-6 pb-12">
        {/* Connect Wallet Banner */}
        {!isConnected && (
          <div className="mb-12 relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-comic-red/30 via-comic-orange/30 to-comic-yellow/30 animate-pulse"></div>
            <div className="relative comic-panel p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-4 border-comic-yellow">
              <div>
                <h3 className="text-3xl font-comic text-comic-yellow mb-2">⚠️ WALLET NOT CONNECTED!</h3>
                <p className="text-xl text-white font-bold">Connect your HashPack wallet to start collecting comics!</p>
              </div>
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="px-8 py-4 bg-gradient-to-r from-comic-yellow to-comic-orange text-dark-900 rounded-xl font-black text-xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1 transition flex items-center gap-3 whitespace-nowrap"
              >
                <WalletIcon className="w-6 h-6" />
                {connecting ? 'Connecting...' : 'Connect HashPack'}
              </button>
            </div>
          </div>
        )}

        {/* Real-time Stats Bar - Comic Store Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Comics', value: stats.totalListings, icon: '📚', color: 'from-comic-blue to-comic-cyan', filterType: 'all' },
            { label: 'Live Auctions', value: stats.activeAuctions, icon: '🔨', color: 'from-comic-purple to-comic-pink', filterType: 'auction' },
            { label: 'Trading Volume', value: `${stats.totalVolume}`, unit: 'HBAR', icon: '💎', color: 'from-comic-green to-comic-cyan', filterType: null },
            { label: 'Floor Price', value: `${stats.floorPrice}`, unit: 'HBAR', icon: '📊', color: 'from-comic-yellow to-comic-orange', filterType: null }
          ].map((stat, i) => (
            <div
              key={i}
              className="relative group"
              onClick={() => stat.filterType && setFilter(stat.filterType)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-20 rounded-2xl blur-xl group-hover:opacity-30 transition`}></div>
              <div className={`relative comic-panel p-6 text-center hover:scale-105 transition-transform ${stat.filterType ? 'cursor-pointer' : ''}`}>
                <div className="text-5xl mb-3">{stat.icon}</div>
                <div className="text-3xl md:text-4xl font-comic text-white mb-1">
                  {stat.value}
                  {stat.unit && <span className="text-lg ml-1 text-comic-yellow">{stat.unit}</span>}
                </div>
                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">{stat.label}</div>
                {stat.filterType && (
                  <div className="mt-2 text-xs text-comic-cyan opacity-0 group-hover:opacity-100 transition">
                    Click to filter
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Featured Section - Like New Releases in a Comic Store */}
        {!loading && featuredListings.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <Star className="w-8 h-8 text-comic-yellow" />
              <h2 className="text-4xl md:text-5xl font-comic text-comic-yellow drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
                🌟 FEATURED COMICS
              </h2>
              <Flame className="w-8 h-8 text-comic-orange" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {featuredListings.map((listing) => {
                try {
                  return (
                    <FeaturedCard
                      key={listing._id}
                      listing={listing}
                      isConnected={isConnected}
                      onBuy={handleBuyClick}
                      onBid={handleBidClick}
                    />
                  );
                } catch (error) {
                  console.error('Error rendering featured card:', error, listing);
                  return null; // Skip this card if it errors
                }
              })}
            </div>
          </div>
        )}

        {/* Filters & Sort - Comic Store Shelves */}
        <div className="mb-8 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
          {/* Type Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-2 lg:mb-0 w-full lg:w-auto">
              Browse by:
            </div>
            {[
              { id: 'all', label: 'All Comics', icon: '📚', gradient: 'from-comic-blue to-comic-cyan' },
              { id: 'fixed-price', label: 'Buy Now', icon: '💳', gradient: 'from-comic-green to-comic-cyan' },
              { id: 'auction', label: 'Auctions', icon: '🔨', gradient: 'from-comic-purple to-comic-pink' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-6 py-3 rounded-xl font-bold uppercase transition-all transform hover:scale-105 ${
                  filter === f.id
                    ? `bg-gradient-to-r ${f.gradient} text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]`
                    : 'bg-dark-800 text-gray-400 border-2 border-dark-600 hover:border-comic-yellow hover:text-white'
                }`}
              >
                <span className="mr-2 text-xl">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400 uppercase font-bold tracking-wider">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-6 py-3 bg-dark-800 border-2 border-dark-600 rounded-xl text-white font-bold uppercase focus:outline-none focus:border-comic-yellow cursor-pointer hover:border-comic-cyan transition"
            >
              <option value="newest">⚡ Newest First</option>
              <option value="price-low">💰 Price: Low to High</option>
              <option value="price-high">💎 Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Main Comics Grid - Like Comic Store Wall Display */}
        {loading ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] bg-dark-800 rounded-2xl animate-pulse border-4 border-dark-700"
              />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-comic-cyan" />
              <h3 className="text-2xl font-comic text-white">
                All Listings ({listings.length})
              </h3>
            </div>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {listings.map((listing) => {
                try {
                  return (
                    <ListingCard
                      key={listing._id}
                      listing={listing}
                      isConnected={isConnected}
                      onBuy={handleBuyClick}
                      onBid={handleBidClick}
                    />
                  );
                } catch (error) {
                  console.error('Error rendering listing card:', error, listing);
                  return null; // Skip this card if it errors
                }
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-9xl mb-8">🏪</div>
            <h3 className="text-4xl font-comic text-comic-yellow mb-4 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
              STORE IS EMPTY!
            </h3>
            <p className="text-xl text-gray-400 mb-8 font-bold">
              Be the first creator to stock the shelves with epic comics!
            </p>
            {isConnected && (
              <Link
                to="/profile"
                className="inline-block px-8 py-4 bg-gradient-to-r from-comic-yellow to-comic-orange text-dark-900 rounded-xl font-black text-xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1 transition"
              >
                List Your Comics 🚀
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Buy Modal */}
      {showBuyModal && selectedListing && (
        <BuyModal
          listing={selectedListing}
          onClose={() => setShowBuyModal(false)}
          onBuy={handleBuyNFT}
        />
      )}

      {/* Bid Modal */}
      {showBidModal && selectedListing && (
        <BidModal
          listing={selectedListing}
          bidAmount={bidAmount}
          setBidAmount={setBidAmount}
          onClose={() => setShowBidModal(false)}
          onBid={handlePlaceBid}
        />
      )}
    </div>
  );
}

// Featured Card Component - Larger, more prominent
function FeaturedCard({ listing, isConnected, onBuy, onBid }) {
  // Safely extract image URL with multiple fallbacks
  let imageUrl = 'https://via.placeholder.com/600x900/1a1a1a/FFD700?text=FEATURED';
  try {
    imageUrl = listing.metadata?.imageUrl ||
               listing.episode?.content?.coverImage?.url ||
               listing.episode?.content?.coverImage?.ipfsHash ||
               listing.comic?.content?.coverImage?.url ||
               listing.comic?.content?.coverImage ||
               imageUrl;
  } catch (e) {
    console.error('Error extracting featured image URL:', e);
  }

  const title = listing.metadata?.title || listing.episode?.title || listing.comic?.title || 'Featured Comic';

  // Safely extract price - handle both object and number formats
  let price = 0;
  try {
    if (listing.listingType === 'auction' && listing.auction?.currentBid) {
      price = listing.auction.currentBid;
    } else if (typeof listing.price === 'object') {
      price = listing.price?.amount || 0;
    } else {
      price = listing.price || 0;
    }
  } catch (e) {
    console.error('Error extracting featured price:', e);
  }

  return (
    <div className="group relative">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-comic-yellow via-comic-orange to-comic-red opacity-75 rounded-3xl blur-xl group-hover:opacity-100 transition"></div>

      <div className="relative comic-card overflow-hidden rounded-2xl">
        {/* Main Image */}
        <div className="aspect-[2/3] relative overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-60"></div>

          {/* Badge */}
          {listing.listingType === 'auction' && (
            <div className="absolute top-4 left-4 px-4 py-2 bg-comic-purple text-white rounded-xl font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2">
              <Gavel className="w-5 h-5" />
              AUCTION
            </div>
          )}

          {/* Featured Badge */}
          <div className="absolute top-4 right-4 px-4 py-2 bg-comic-yellow text-dark-900 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2">
            <Star className="w-5 h-5" />
            FEATURED
          </div>

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h3 className="text-3xl font-comic text-white mb-3 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
              {title}
            </h3>

            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-xs text-gray-300 mb-1 uppercase font-bold">
                  {listing.listingType === 'auction' ? 'Current Bid' : 'Price'}
                </div>
                <div className="text-4xl font-comic text-comic-yellow drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                  {price} <span className="text-2xl">HBAR</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {isConnected ? (
              <button
                onClick={() => listing.listingType === 'auction' ? onBid(listing) : onBuy(listing)}
                className="w-full py-4 bg-gradient-to-r from-comic-green to-comic-cyan text-dark-900 rounded-xl font-black text-lg uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1 transition flex items-center justify-center gap-2"
              >
                {listing.listingType === 'auction' ? (
                  <>
                    <Gavel className="w-6 h-6" />
                    Place Bid Now
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-6 h-6" />
                    Buy Now
                  </>
                )}
              </button>
            ) : (
              <div className="text-center text-sm text-gray-400 py-3 font-bold uppercase bg-dark-900/80 rounded-xl">
                Connect wallet to buy
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Regular Listing Card
function ListingCard({ listing, isConnected, onBuy, onBid }) {
  // Safely extract image URL with multiple fallbacks
  let imageUrl = 'https://via.placeholder.com/400x600/1a1a1a/0066FF?text=COMIC';
  try {
    imageUrl = listing.metadata?.imageUrl ||
               listing.episode?.content?.coverImage?.url ||
               listing.episode?.content?.coverImage?.ipfsHash ||
               listing.comic?.content?.coverImage?.url ||
               listing.comic?.content?.coverImage ||
               imageUrl;
  } catch (e) {
    console.error('Error extracting image URL:', e);
  }

  // Safely extract title
  const title = listing.metadata?.title || listing.episode?.title || listing.comic?.title || 'Untitled Comic';

  // Safely extract price - handle both object and number formats
  let price = 0;
  try {
    if (listing.listingType === 'auction' && listing.auction?.currentBid) {
      price = listing.auction.currentBid;
    } else if (typeof listing.price === 'object') {
      price = listing.price?.amount || 0;
    } else {
      price = listing.price || 0;
    }
  } catch (e) {
    console.error('Error extracting price:', e, listing);
  }

  console.log('🎨 Rendering listing card:', {
    id: listing._id,
    title,
    price,
    imageUrl,
    listingType: listing.listingType
  });

  return (
    <div className="comic-card group hover:scale-105 transition-transform">
      {/* Cover Image */}
      <div className="aspect-[2/3] relative overflow-hidden bg-gradient-to-br from-comic-blue/20 to-comic-purple/20 rounded-t-2xl">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* Type Badge */}
        {listing.listingType === 'auction' && (
          <div className="absolute top-3 left-3 px-3 py-2 bg-comic-purple/90 backdrop-blur-sm text-white rounded-lg font-bold text-xs uppercase shadow-lg flex items-center gap-1">
            <Gavel className="w-4 h-4" />
            AUCTION
          </div>
        )}

        {/* Price Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
          <div className="text-xs text-gray-300 mb-1 uppercase font-bold">
            {listing.listingType === 'auction' ? 'Current Bid' : 'Price'}
          </div>
          <div className="text-3xl font-comic text-comic-yellow">
            {price} <span className="text-lg">HBAR</span>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 bg-dark-800 rounded-b-2xl border-t-2 border-dark-700">
        <h3 className="font-bold text-lg mb-2 text-white group-hover:text-comic-yellow transition truncate">
          {title}
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          by {listing.seller?.username || 'Unknown'}
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
            Connect wallet
          </div>
        )}
      </div>
    </div>
  );
}

// Buy Modal Component
function BuyModal({ listing, onClose, onBuy }) {
  const imageUrl = listing.metadata?.imageUrl || listing.episode?.content?.coverImage?.url;
  const title = listing.metadata?.title || listing.episode?.title;
  const price = typeof listing.price === 'object' ? listing.price.amount : listing.price;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="relative max-w-2xl w-full">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-comic-green via-comic-cyan to-comic-blue opacity-75 rounded-3xl blur-2xl"></div>

        <div className="relative bg-dark-800 border-4 border-comic-green rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b-4 border-comic-green/30 bg-gradient-to-r from-comic-green/20 to-comic-cyan/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-8 h-8 text-comic-green" />
                <h2 className="text-4xl font-comic text-comic-green drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                  BUY COMIC!
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition p-2 hover:bg-dark-700 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="flex gap-6 mb-8">
              <img
                src={imageUrl}
                alt={title}
                className="w-48 h-72 object-cover rounded-2xl shadow-2xl flex-shrink-0 border-4 border-dark-700"
              />
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-400 mb-6 text-lg">Serial #{listing.serialNumber}</p>

                <div className="bg-dark-900 rounded-2xl p-6 border-2 border-comic-green/30">
                  <div className="text-sm text-gray-400 mb-2 uppercase font-bold">TOTAL PRICE</div>
                  <div className="text-6xl font-comic text-comic-green mb-4 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                    {price} <span className="text-3xl">HBAR</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    ⚡ Instant ownership transfer
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onBuy}
              className="w-full py-5 bg-gradient-to-r from-comic-green to-comic-cyan text-dark-900 rounded-2xl font-black text-2xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1 transition flex items-center justify-center gap-3"
            >
              <ShoppingCart className="w-8 h-8" />
              CONFIRM PURCHASE 🎉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bid Modal Component
function BidModal({ listing, bidAmount, setBidAmount, onClose, onBid }) {
  const imageUrl = listing.metadata?.imageUrl || listing.episode?.content?.coverImage?.url;
  const title = listing.metadata?.title || listing.episode?.title;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="relative max-w-2xl w-full">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-comic-purple via-comic-pink to-comic-red opacity-75 rounded-3xl blur-2xl"></div>

        <div className="relative bg-dark-800 border-4 border-comic-purple rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b-4 border-comic-purple/30 bg-gradient-to-r from-comic-purple/20 to-comic-pink/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gavel className="w-8 h-8 text-comic-purple" />
                <h2 className="text-4xl font-comic text-comic-purple drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                  PLACE BID!
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition p-2 hover:bg-dark-700 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="flex gap-6 mb-8">
              <img
                src={imageUrl}
                alt={title}
                className="w-48 h-72 object-cover rounded-2xl shadow-2xl flex-shrink-0 border-4 border-dark-700"
              />
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-400 mb-6 text-lg">Serial #{listing.serialNumber}</p>

                <div className="bg-dark-900 rounded-2xl p-6 border-2 border-comic-purple/30 mb-6">
                  <div className="text-sm text-gray-400 mb-2 uppercase font-bold">CURRENT BID</div>
                  <div className="text-5xl font-comic text-comic-purple mb-2 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                    {listing.auction?.currentBid || 0} <span className="text-2xl">HBAR</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {listing.auction?.bids?.length || 0} bids placed
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-bold text-comic-purple mb-3 uppercase">
                    Your Bid Amount (HBAR)
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Minimum: ${(listing.auction?.currentBid || 0) + 1}`}
                    className="w-full px-6 py-4 bg-dark-700 border-2 border-comic-purple/30 rounded-2xl text-white text-2xl font-bold focus:border-comic-purple focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={onBid}
              className="w-full py-5 bg-gradient-to-r from-comic-purple to-comic-pink text-white rounded-2xl font-black text-2xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1 transition flex items-center justify-center gap-3"
            >
              <Gavel className="w-8 h-8" />
              PLACE BID NOW 🔨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
