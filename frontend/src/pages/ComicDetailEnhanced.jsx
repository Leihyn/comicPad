import { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, Eye, Share2, ShoppingCart, Zap, ExternalLink, Rocket, BookOpen, Star, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import comicService from '../services/comicService';
import marketplaceService from '../services/marketplaceService';
import { useAuth } from '../contexts/AuthContext';
import { WalletConnectContext } from '../contexts/WalletConnectContext';
import { mintNFTs } from '../services/hederaService';
import { hashPackWallet } from '../services/wallets/hashpackClient';
import { Hbar, TokenId, AccountId } from '@hashgraph/sdk';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';

if (typeof window !== 'undefined') {
  window.toast = toast;
}

export default function ComicDetailEnhanced() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { isConnected } = useContext(WalletConnectContext);
  const [comic, setComic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [buying, setBuying] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [previewPage, setPreviewPage] = useState(0);
  const [marketplaceListing, setMarketplaceListing] = useState(null);

  useEffect(() => {
    loadComic();
    checkMarketplaceListing();
  }, [id]);

  const checkMarketplaceListing = async () => {
    try {
      // Check if this comic has an active marketplace listing
      const response = await fetch(`${API_BASE}/marketplace/listings?comicId=${id}&status=active`);
      const data = await response.json();
      if (data.success && data.data.listings && data.data.listings.length > 0) {
        setMarketplaceListing(data.data.listings[0]);
      }
    } catch (error) {
      console.error('Failed to check marketplace listing:', error);
    }
  };

  const loadComic = async () => {
    try {
      const data = await comicService.getComicById(id);
      setComic(data);
    } catch (error) {
      console.error('Failed to load comic:', error);
      toast.error('Failed to load comic');
    } finally {
      setLoading(false);
    }
  };

  const handleMintNFT = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    setMinting(true);
    try {
      const token = localStorage.getItem('token');
      toast.loading(`Minting ${comic.supply} NFT(s) using backend...`, { id: 'mint' });

      // DEMO MODE: Use backend minting to bypass HashPack wallet popup issues
      const response = await axios.post(
        `${API_BASE}/comics/episodes/${id}/mint-backend`,
        {
          quantity: comic.supply || 1
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Backend minting response:', response.data);

      toast.success(`Successfully minted ${comic.supply} NFT(s)! 🎉`, { id: 'mint' });
      await loadComic();
    } catch (error) {
      console.error('Mint error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to mint NFTs', { id: 'mint' });
    } finally {
      setMinting(false);
    }
  };

  const handleBuyNFT = async () => {
    if (!marketplaceListing) {
      toast.error('This comic is not listed for sale');
      return;
    }

    if (!hashPackWallet.isConnected()) {
      toast.error('Please connect your wallet first');
      return;
    }

    setBuying(true);
    try {
      toast.loading('Preparing purchase transaction...', { id: 'buy-nft' });

      const sellerAccountId = AccountId.fromString(marketplaceListing.sellerAccountId);
      const tokenIdString = marketplaceListing.comic?.collection?.tokenId || comic.collection?.tokenId;
      const tokenId = TokenId.fromString(tokenIdString);
      const serialNumber = marketplaceListing.serialNumber;
      // Convert HBAR to tinybars (1 HBAR = 100,000,000 tinybars)
      const priceInHbar = Number(marketplaceListing.price);
      const priceInTinybars = Math.round(priceInHbar * 100_000_000);
      console.log('💰 Price conversion:', {
        originalHbar: marketplaceListing.price,
        tinybars: priceInTinybars
      });
      const price = Hbar.fromTinybars(priceInTinybars);

      console.log('💰 Purchasing NFT:', {
        tokenId: tokenId.toString(),
        serialNumber,
        seller: sellerAccountId.toString(),
        price: price.toString()
      });

      toast.loading('Opening HashPack to approve purchase...', { id: 'buy-nft' });

      const transactionId = await hashPackWallet.transferNFT(
        sellerAccountId,
        tokenId,
        serialNumber,
        price
      );

      console.log('✅ Purchase transaction executed:', transactionId.toString());
      toast.loading('Updating ownership records...', { id: 'buy-nft' });

      await marketplaceService.buyNFT(marketplaceListing._id, {
        paymentTransactionId: transactionId.toString(),
        status: 'SUCCESS'
      });

      toast.success('NFT purchased successfully! 🎉', { id: 'buy-nft' });
      await loadComic();
      await checkMarketplaceListing();
    } catch (error) {
      console.error('Buy NFT error:', error);
      toast.error(error.message || 'Failed to buy NFT', { id: 'buy-nft' });
    } finally {
      setBuying(false);
    }
  };

  const handleCancelListing = async () => {
    if (!marketplaceListing) {
      toast.error('No listing to cancel');
      return;
    }

    if (!window.confirm('Are you sure you want to remove this listing?')) {
      return;
    }

    try {
      toast.loading('Cancelling listing...', { id: 'cancel-listing' });

      await marketplaceService.cancelListing(marketplaceListing._id);

      toast.success('Listing cancelled successfully!', { id: 'cancel-listing' });
      setMarketplaceListing(null);
      await loadComic();
      await checkMarketplaceListing();
    } catch (error) {
      console.error('Cancel listing error:', error);
      toast.error(error.message || 'Failed to cancel listing', { id: 'cancel-listing' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-center">
          <p className="text-2xl text-gray-400 mb-4">Comic not found</p>
          <Link to="/explore" className="text-purple-400 hover:text-purple-300 font-bold">
            ← Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?._id === comic?.creator?._id;
  const isPending = comic?.status === 'pending';
  const isListingSeller = marketplaceListing && user?._id === marketplaceListing.seller;

  // Extract page URLs from pages array - use 'web' field for display
  console.log('📚 Comic Detail - Pages Debug:', {
    hasContent: !!comic?.content,
    hasPages: !!comic?.content?.pages,
    pagesLength: comic?.content?.pages?.length,
    pagesRaw: comic?.content?.pages,
    comicStatus: comic?.status
  });

  const pages = (comic?.content?.pages || [])
    .map(page => {
      const url = page?.web || page?.original || page;
      console.log('🔍 Detail page:', { page, url });
      return typeof url === 'string' ? url : null;
    })
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-8">
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-purple-400 transition">Home</Link>
          <span>/</span>
          <Link to="/explore" className="hover:text-purple-400 transition">Explore</Link>
          <span>/</span>
          <span className="text-white">{comic.title}</span>
        </nav>
      </div>

      <div className="container mx-auto px-4 pb-12">
        {/* Main Grid - Bookshop Style */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left Column - Cover & Quick Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {/* Cover Image */}
              <div className="relative group mb-6">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative">
                  <img
                    src={comic.content?.coverImage || '/placeholder.jpg'}
                    alt={comic.title}
                    className="w-full rounded-2xl shadow-2xl aspect-[2/3] object-cover"
                  />
                  {isPending && (
                    <div className="absolute top-4 right-4 px-4 py-2 bg-yellow-500/90 backdrop-blur rounded-lg font-bold text-black flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      PENDING
                    </div>
                  )}
                </div>
              </div>

              {/* Price Card */}
              <div className="bg-gray-800/80 backdrop-blur border-2 border-purple-500/30 rounded-2xl p-6 mb-4">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-sm text-purple-300 mb-1">Price</p>
                    <p className="text-4xl font-black text-white">
                      {comic.price} <span className="text-lg text-purple-400">HBAR</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-purple-300 mb-1">Available</p>
                    <p className="text-2xl font-black text-white">
                      {comic.supply - comic.minted}<span className="text-purple-400">/{comic.supply}</span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {isPending && isOwner ? (
                  <button
                    onClick={handleMintNFT}
                    disabled={minting}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-black text-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <Rocket className="w-5 h-5" />
                    {minting ? 'Minting...' : `Mint ${comic.supply} NFT(s)`}
                  </button>
                ) : marketplaceListing && isListingSeller ? (
                  <button
                    onClick={handleCancelListing}
                    className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-black text-lg hover:from-red-600 hover:to-orange-600 transition flex items-center justify-center gap-2 shadow-lg shadow-red-500/50"
                  >
                    <X className="w-5 h-5" />
                    Cancel Listing
                  </button>
                ) : marketplaceListing ? (
                  <button
                    onClick={handleBuyNFT}
                    disabled={buying}
                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-black text-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/50"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {buying ? 'Purchasing...' : `Buy for ${marketplaceListing.price} HBAR`}
                  </button>
                ) : (
                  <div className="w-full py-4 bg-gray-700/50 border-2 border-gray-600 text-gray-400 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Not Listed for Sale
                  </div>
                )}

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {!isPending && (
                    <Link
                      to={`/reader/${comic._id}`}
                      className="py-3 bg-blue-500/20 border-2 border-blue-500/50 text-blue-300 rounded-xl hover:bg-blue-500/30 transition font-bold flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-5 h-5" />
                      Read
                    </Link>
                  )}
                  <button className="py-3 bg-purple-500/20 border-2 border-purple-500/50 text-purple-300 rounded-xl hover:bg-purple-500/30 transition font-bold flex items-center justify-center gap-2">
                    <Heart className="w-5 h-5" />
                    Favorite
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/80 backdrop-blur border border-purple-500/30 rounded-xl p-4 text-center">
                  <Eye className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-black text-white">{comic.stats?.views || 0}</p>
                  <p className="text-xs text-gray-400">Views</p>
                </div>
                <div className="bg-gray-800/80 backdrop-blur border border-purple-500/30 rounded-xl p-4 text-center">
                  <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                  <p className="text-2xl font-black text-white">{comic.stats?.favorites || 0}</p>
                  <p className="text-xs text-gray-400">Favorites</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tabs & Content */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
                {comic.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <Link
                  to={`/profile/${comic.creator?._id}`}
                  className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-2 text-lg"
                >
                  <Rocket className="w-5 h-5" />
                  by {comic.creator?.username}
                </Link>
                {comic.series && (
                  <span className="px-4 py-2 bg-purple-900/50 border border-purple-500/30 rounded-xl text-purple-300 font-bold">
                    {comic.series} #{comic.issueNumber}
                  </span>
                )}
                <span className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl text-purple-300 font-bold capitalize">
                  {comic.rarity}
                </span>
              </div>

              <p className="text-xl text-gray-300 leading-relaxed">{comic.description}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
              {['overview', 'preview', 'details'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-xl font-bold uppercase transition whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab === 'overview' && <BookOpen className="w-4 h-4 inline mr-2" />}
                  {tab === 'preview' && <Eye className="w-4 h-4 inline mr-2" />}
                  {tab === 'details' && <Star className="w-4 h-4 inline mr-2" />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-gray-800/50 backdrop-blur border-2 border-purple-500/30 rounded-2xl p-8">

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-purple-400 mb-4">📖 SYNOPSIS</h3>
                    <p className="text-lg text-gray-300 leading-relaxed">{comic.description || 'No description available.'}</p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-purple-400 mb-4">🎯 QUICK INFO</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-gray-900/50 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-purple-300 text-sm mb-1">Genre</p>
                        <p className="font-bold text-white text-lg">{comic.genre?.join(', ') || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-900/50 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-purple-300 text-sm mb-1">Pages</p>
                        <p className="font-bold text-white text-lg">{comic.pageCount}</p>
                      </div>
                      <div className="bg-gray-900/50 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-purple-300 text-sm mb-1">Edition</p>
                        <p className="font-bold text-white text-lg capitalize">{comic.edition}</p>
                      </div>
                      <div className="bg-gray-900/50 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-purple-300 text-sm mb-1">Language</p>
                        <p className="font-bold text-white text-lg">{comic.language || 'English'}</p>
                      </div>
                    </div>
                  </div>

                  {comic.collection?.tokenId && (
                    <a
                      href={`https://hashscan.io/testnet/token/${comic.collection?.collectionTokenId || comic.collection?.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-bold text-lg"
                    >
                      View on HashScan <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div>
                  <h3 className="text-2xl font-black text-purple-400 mb-6">👁️ PREVIEW PAGES</h3>
                  {pages.length > 0 ? (
                    <div>
                      {/* Current Page */}
                      <div className="relative mb-6 bg-gray-900 rounded-xl overflow-hidden">
                        <img
                          src={pages[previewPage]}
                          alt={`Page ${previewPage + 1}`}
                          className="w-full h-auto"
                        />
                      </div>

                      {/* Page Navigation */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
                          disabled={previewPage === 0}
                          className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center gap-2 transition"
                        >
                          <ChevronLeft className="w-5 h-5" />
                          Previous
                        </button>

                        <span className="text-white font-bold text-lg">
                          Page {previewPage + 1} of {pages.length}
                        </span>

                        <button
                          onClick={() => setPreviewPage(Math.min(pages.length - 1, previewPage + 1))}
                          disabled={previewPage === pages.length - 1}
                          className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center gap-2 transition"
                        >
                          Next
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Thumbnail Gallery */}
                      <div className="grid grid-cols-4 gap-4 mt-6">
                        {pages.map((page, index) => (
                          <button
                            key={index}
                            onClick={() => setPreviewPage(index)}
                            className={`relative rounded-lg overflow-hidden border-2 transition ${
                              previewPage === index
                                ? 'border-purple-500 shadow-lg shadow-purple-500/50'
                                : 'border-gray-700 hover:border-purple-400'
                            }`}
                          >
                            <img src={page} alt={`Thumbnail ${index + 1}`} className="w-full aspect-[2/3] object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-bold">{index + 1}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg">No preview pages available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-purple-400 mb-4">📊 SPECIFICATIONS</h3>
                    <div className="grid gap-4">
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Token ID</span>
                        <span className="font-bold text-white">{comic.collection?.tokenId || 'Pending'}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Collection</span>
                        <span className="font-bold text-white">{comic.collection?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Total Supply</span>
                        <span className="font-bold text-white">{comic.supply}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Minted</span>
                        <span className="font-bold text-white">{comic.minted}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Rarity</span>
                        <span className="font-bold text-white capitalize">{comic.rarity}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-700">
                        <span className="text-gray-400">Status</span>
                        <span className="font-bold text-white capitalize">{comic.status}</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-gray-400">Release Date</span>
                        <span className="font-bold text-white">{new Date(comic.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-purple-400 mb-4">👤 CREATOR INFO</h3>
                    <Link
                      to={`/profile/${comic.creator?._id}`}
                      className="flex items-center gap-4 p-4 bg-gray-900/50 border border-purple-500/20 rounded-xl hover:border-purple-500/50 transition"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-black text-2xl">
                        {comic.creator?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">{comic.creator?.username}</p>
                        <p className="text-purple-400 text-sm">View Profile →</p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
