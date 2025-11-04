import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WalletConnectContext } from '../contexts/WalletConnectContext';
import { Edit, Settings, MapPin, Link as LinkIcon, BookOpen, Zap, Heart, TrendingUp, MoreVertical, X as XIcon } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import NFTActionModal from '../components/common/NFTActionModal';
import marketplaceService from '../services/marketplaceService';

const API_BASE = 'http://localhost:3001/api/v1';

export default function Profile() {
  const navigate = useNavigate();
  const { isConnected, accountId } = useContext(WalletConnectContext);
  const [user, setUser] = useState(null);
  const [createdComics, setCreatedComics] = useState([]);
  const [collectedComics, setCollectedComics] = useState([]);
  const [collections, setCollections] = useState([]);
  const [activeListings, setActiveListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('created');
  const [waitingForLogin, setWaitingForLogin] = useState(false);
  const [selectedComic, setSelectedComic] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Wait for auto-login to complete when wallet connects
    if (isConnected && accountId) {
      const checkAndLoad = async () => {
        setWaitingForLogin(true);
        // Wait for token to be available (auto-login in progress)
        let attempts = 0;
        const maxAttempts = 20; // Wait up to 6 seconds

        while (attempts < maxAttempts) {
          const token = localStorage.getItem('token');
          if (token) {
            console.log('✅ Token found, loading profile...');
            await loadProfile();
            setWaitingForLogin(false);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 300));
          attempts++;
        }

        // If still no token after waiting, show error
        console.log('⚠️ No token found after waiting');
        setWaitingForLogin(false);
        setLoading(false);
      };

      checkAndLoad();
    } else if (!isConnected) {
      setLoading(false);
    }
  }, [isConnected, accountId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found in localStorage');
        toast.error('Authentication required. Please reconnect your wallet.');
        setLoading(false);
        return;
      }

      console.log('📡 Fetching user profile with token...');
      // Fetch user profile
      let userData = null;
      try {
        const userResponse = await axios.get(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ User profile loaded:', userResponse.data);
        userData = userResponse.data?.data?.user || userResponse.data?.user || userResponse.data;
        setUser(userData);
      } catch (err) {
        console.error('❌ Failed to load user profile:', err);
        throw err;
      }

      // Ensure we have user data before continuing
      if (!userData) {
        throw new Error('Failed to load user data');
      }

      // Fetch created comics (creator's comics)
      try {
        console.log('📡 Fetching created comics...');
        const createdResponse = await axios.get(`${API_BASE}/comics/creator/my-comics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Created comics loaded:', createdResponse.data);
        setCreatedComics(createdResponse.data?.data?.comics || createdResponse.data?.comics || []);
      } catch (err) {
        console.error('❌ Failed to load created comics:', err);
        setCreatedComics([]);
      }

      // Fetch collected comics (owned NFTs)
      try {
        console.log('📡 Fetching collected comics...');
        const collectedResponse = await axios.get(`${API_BASE}/comics/user/collection`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Collected comics loaded:', collectedResponse.data);
        setCollectedComics(collectedResponse.data?.data?.comics || collectedResponse.data?.comics || []);
      } catch (err) {
        console.log('⚠️ No collected comics or endpoint error:', err.message);
        setCollectedComics([]);
      }

      // Fetch collections
      try {
        console.log('📡 Fetching collections...');
        const collectionsResponse = await axios.get(`${API_BASE}/comics/collections`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Collections loaded:', collectionsResponse.data);
        setCollections(collectionsResponse.data?.data?.collections || collectionsResponse.data?.collections || []);
      } catch (err) {
        console.error('❌ Failed to load collections:', err);
        setCollections([]);
      }

      // Fetch active marketplace listings
      try {
        console.log('📡 Fetching active listings...');
        const response = await axios.get(`${API_BASE}/marketplace/users/me/listings`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: 'active' }
        });
        console.log('✅ Active listings response:', response.data);
        const listingsData = response.data?.data || [];
        console.log('✅ Active listings loaded:', listingsData);
        setActiveListings(Array.isArray(listingsData) ? listingsData : []);
      } catch (err) {
        console.error('❌ Failed to load active listings:', err);
        setActiveListings([]);
      }

    } catch (error) {
      console.error('❌ PROFILE LOAD FAILED:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again');
      } else {
        toast.error('Failed to load profile data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleComicClick = (comic, event) => {
    // If ready/published and minted, open reader directly
    if ((comic.status === 'published' || comic.status === 'ready') && comic.minted > 0) {
      navigate(`/reader/${comic._id}`);
    } else {
      // For pending/unminted comics, show action modal
      setSelectedComic(comic);
      setShowModal(true);
    }
  };

  const handleActionsClick = (comic, event) => {
    event.stopPropagation(); // Prevent triggering handleComicClick
    setSelectedComic(comic);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedComic(null);
  };

  const handleModalSuccess = () => {
    // Reload profile data after successful action
    loadProfile();
  };

  const handleCancelListing = async (listingId) => {
    if (!confirm('Are you sure you want to cancel this listing?')) {
      return;
    }

    try {
      toast.loading('Cancelling listing...', { id: 'cancel-listing' });
      await marketplaceService.cancelListing(listingId);
      toast.success('Listing cancelled successfully!', { id: 'cancel-listing' });
      loadProfile(); // Refresh data
    } catch (error) {
      console.error('Cancel listing error:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel listing', { id: 'cancel-listing' });
    }
  };

  if (loading || waitingForLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🔐</div>
          <div className="text-white text-2xl mb-2">
            {waitingForLogin ? 'Logging in with wallet...' : 'Loading profile...'}
          </div>
          {isConnected && (
            <p className="text-purple-400 text-sm">Connected: {accountId}</p>
          )}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">👤</div>
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-300 mb-6">Please connect your HashPack wallet to view your profile</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition inline-block"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold text-white mb-4">Failed to Load Profile</h1>
          <p className="text-gray-300 mb-6">There was an error loading your profile. Please try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition inline-block"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Cover Image */}
      <div className="h-64 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 relative">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
      </div>

      <div className="container mx-auto px-4">
        {/* Profile Header */}
        <div className="relative -mt-32 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              {/* Avatar */}
              <div className="w-40 h-40 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-4 border-purple-400 shadow-2xl flex items-center justify-center text-5xl font-black text-white">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-black text-white mb-2">
                      {user?.profile?.displayName || user?.username}
                    </h1>
                    <p className="text-purple-300 text-lg">@{user?.username}</p>
                    {isConnected && (
                      <p className="text-sm text-green-400 mt-2 flex items-center gap-2 justify-center md:justify-start">
                        <Zap className="w-4 h-4" />
                        {accountId}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to="/settings"
                      className="px-4 py-2 bg-purple-500/20 border-2 border-purple-500 text-purple-300 rounded-lg hover:bg-purple-500/30 transition font-bold flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                  </div>
                </div>

                {user?.profile?.bio && (
                  <p className="mt-4 text-gray-300 max-w-2xl">{user.profile.bio}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 max-w-xl">
                  <div className="bg-purple-900/30 rounded-lg p-4 text-center border border-purple-500/30">
                    <div className="text-3xl font-black text-purple-400">{createdComics.length}</div>
                    <div className="text-sm text-gray-400 mt-1">Created</div>
                  </div>
                  <div className="bg-blue-900/30 rounded-lg p-4 text-center border border-blue-500/30">
                    <div className="text-3xl font-black text-blue-400">{collectedComics.length}</div>
                    <div className="text-sm text-gray-400 mt-1">Collected</div>
                  </div>
                  <div className="bg-pink-900/30 rounded-lg p-4 text-center border border-pink-500/30">
                    <div className="text-3xl font-black text-pink-400">{collections.length}</div>
                    <div className="text-sm text-gray-400 mt-1">Collections</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800/50 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl shadow-2xl mb-8">
          <div className="flex border-b border-purple-500/30">
            <button
              onClick={() => setActiveTab('created')}
              className={`px-6 py-4 font-bold transition ${
                activeTab === 'created'
                  ? 'border-b-4 border-purple-500 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-5 h-5 inline mr-2" />
              Created ({createdComics.length})
            </button>
            <button
              onClick={() => setActiveTab('collected')}
              className={`px-6 py-4 font-bold transition ${
                activeTab === 'collected'
                  ? 'border-b-4 border-purple-500 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Heart className="w-5 h-5 inline mr-2" />
              Collected ({collectedComics.length})
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={`px-6 py-4 font-bold transition ${
                activeTab === 'collections'
                  ? 'border-b-4 border-purple-500 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Collections ({collections.length})
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={`px-6 py-4 font-bold transition ${
                activeTab === 'listings'
                  ? 'border-b-4 border-purple-500 text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline mr-2" />
              Active Listings ({activeListings.length})
            </button>
          </div>

          <div className="p-8">
            {/* Created Tab - Grouped by Collection */}
            {activeTab === 'created' && (
              <div>
                {createdComics.length > 0 ? (
                  <div className="space-y-8">
                    {/* Group comics by collection */}
                    {Object.entries(
                      createdComics.reduce((groups, comic) => {
                        const collectionId = comic.collection?._id || 'uncategorized';
                        const collectionName = comic.collection?.name || 'Uncategorized';
                        if (!groups[collectionId]) {
                          groups[collectionId] = { name: collectionName, comics: [] };
                        }
                        groups[collectionId].comics.push(comic);
                        return groups;
                      }, {})
                    ).map(([collectionId, { name, comics }]) => (
                      <div key={collectionId} className="space-y-4">
                        {/* Collection Header */}
                        <div className="flex items-center gap-4 pb-4 border-b border-purple-500/30">
                          <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded"></div>
                          <div>
                            <h3 className="text-2xl font-black text-white">{name}</h3>
                            <p className="text-sm text-gray-400">{comics.length} comic{comics.length > 1 ? 's' : ''}</p>
                          </div>
                        </div>

                        {/* Comics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                          {comics.map((comic) => (
                            <div
                              key={comic._id}
                              onClick={() => handleComicClick(comic)}
                              className="group relative bg-gray-700/50 rounded-lg overflow-hidden border-2 border-purple-500/30 hover:border-purple-500 transition shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer"
                            >
                              {/* Menu Button */}
                              <button
                                onClick={(e) => handleActionsClick(comic, e)}
                                className="absolute top-2 right-2 z-10 p-2 bg-gray-900/80 hover:bg-gray-800 rounded-full transition"
                                title="More actions"
                              >
                                <MoreVertical className="w-4 h-4 text-white" />
                              </button>

                              <div className="aspect-[2/3] bg-gray-800">
                                {comic.content?.coverImage ? (
                                  <img
                                    src={comic.content.coverImage}
                                    alt={comic.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                                    📚
                                  </div>
                                )}
                              </div>
                              <div className="p-4">
                                <h3 className="font-bold text-white mb-1 truncate">{comic.title}</h3>
                                <p className="text-sm text-gray-400 mb-2">{comic.price} HBAR</p>
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`px-2 py-1 rounded ${
                                    comic.status === 'published' ? 'bg-green-900/30 text-green-400' :
                                    comic.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                                    'bg-gray-700 text-gray-400'
                                  }`}>
                                    {comic.status}
                                  </span>
                                  <span className="text-gray-400">{comic.minted}/{comic.supply} minted</span>
                                </div>
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <span className="px-6 py-2 bg-purple-500 text-white rounded-lg font-bold">
                                  {((comic.status === 'published' || comic.status === 'ready') && comic.minted > 0) ? (
                                    <>
                                      <BookOpen className="w-4 h-4 inline mr-2" />
                                      Read Comic
                                    </>
                                  ) : (
                                    'Manage Comic'
                                  )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📖</div>
                    <p className="text-gray-400 mb-6">No comics created yet</p>
                    <Link
                      to="/studio/create"
                      className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition inline-block"
                    >
                      Create Your First Comic
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Collected Tab */}
            {activeTab === 'collected' && (
              <div>
                {collectedComics.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {collectedComics.map((comic) => (
                      <div
                        key={comic._id}
                        onClick={() => handleComicClick(comic)}
                        className="group relative bg-gray-700/50 rounded-lg overflow-hidden border-2 border-blue-500/30 hover:border-blue-500 transition shadow-lg cursor-pointer hover:scale-105"
                      >
                        {/* Menu Button */}
                        <button
                          onClick={(e) => handleActionsClick(comic, e)}
                          className="absolute top-2 right-2 z-10 p-2 bg-gray-900/80 hover:bg-gray-800 rounded-full transition"
                          title="More actions"
                        >
                          <MoreVertical className="w-4 h-4 text-white" />
                        </button>
                        <div className="aspect-[2/3] bg-gray-800">
                          {comic.content?.coverImage ? (
                            <img
                              src={comic.content.coverImage}
                              alt={comic.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                              📚
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-white mb-1 truncate">{comic.title}</h3>
                          <p className="text-sm text-blue-400">Owned: {comic.ownedNFTs?.length || 1} NFT(s)</p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <span className="px-6 py-2 bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Read Now
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💎</div>
                    <p className="text-gray-400 mb-6">No comics collected yet</p>
                    <Link
                      to="/marketplace"
                      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-bold hover:from-blue-600 hover:to-cyan-600 transition inline-block"
                    >
                      Browse Marketplace
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Collections Tab */}
            {activeTab === 'collections' && (
              <div>
                {collections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map((collection) => (
                      <div
                        key={collection._id}
                        onClick={() => navigate(`/creator-studio?collection=${collection._id}`)}
                        className="bg-gray-700/50 rounded-lg p-6 border-2 border-purple-500/30 hover:border-purple-500 transition cursor-pointer hover:scale-105 hover:shadow-2xl group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-400 transition">{collection.name}</h3>
                            <p className="text-purple-300 text-sm font-mono">{collection.symbol}</p>
                          </div>
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold">
                            NFT
                          </span>
                        </div>
                        {collection.description && (
                          <p className="text-sm text-gray-400 mb-4 line-clamp-2">{collection.description}</p>
                        )}
                        <div className="flex items-center justify-between text-sm pt-4 border-t border-purple-500/20">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">Royalty:</span>
                            <span className="text-purple-400 font-bold">{collection.royaltyPercentage}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">Minted:</span>
                            <span className="text-green-400 font-bold">{collection.totalMinted || 0}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-purple-500/20">
                          <a
                            href={`https://hashscan.io/testnet/token/${collection.collectionTokenId || collection.tokenId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            View on HashScan
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎨</div>
                    <p className="text-gray-400 mb-4">No collections yet</p>
                    <Link
                      to="/creator-studio"
                      className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition"
                    >
                      Create Your First Collection
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Active Listings Tab */}
            {activeTab === 'listings' && (
              <div>
                {activeListings.length > 0 ? (
                  <div className="space-y-4">
                    {activeListings.map((listing) => {
                      // Get cover image from episode or comic or metadata
                      const coverImage = listing.episode?.content?.coverImage ||
                                       listing.comic?.content?.coverImage ||
                                       listing.metadata?.imageUrl ||
                                       '/placeholder.jpg';

                      // Get title from episode or comic or metadata
                      const title = listing.episode?.title ||
                                   listing.comic?.title ||
                                   listing.metadata?.title ||
                                   'Untitled';

                      return (
                        <div
                          key={listing._id}
                          className="bg-gray-700/50 rounded-lg p-6 border-2 border-purple-500/30 hover:border-purple-500 transition flex items-center gap-6"
                        >
                          <img
                            src={coverImage}
                            alt={title}
                            className="w-24 h-36 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                            <div className="flex items-center gap-4 text-sm mb-3">
                              <span className="px-3 py-1 bg-purple-500/30 text-purple-300 rounded-full font-bold">
                                {listing.listingType === 'fixed-price' ? '💳 Fixed Price' : '🔨 Auction'}
                              </span>
                              <span className="text-gray-400">Serial #{listing.serialNumber}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-gray-400">
                                  {listing.listingType === 'auction' ? 'Current Bid' : 'Price'}
                                </div>
                                <div className="text-2xl font-bold text-green-400">
                                  {listing.listingType === 'auction'
                                    ? (listing.auction?.currentBid || 0)
                                    : (listing.price?.amount || listing.price || 0)} HBAR
                                </div>
                                {listing.listingType === 'auction' && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {listing.auction?.bids?.length || 0} bids
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleCancelListing(listing._id)}
                                className="px-6 py-3 bg-red-500/20 border-2 border-red-500 text-red-400 rounded-lg font-bold hover:bg-red-500/30 transition flex items-center gap-2"
                              >
                                <XIcon className="w-5 h-5" />
                                Unlist
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🛒</div>
                    <p className="text-gray-400 mb-4">No active listings</p>
                    <Link
                      to="/profile"
                      className="text-purple-400 hover:text-purple-300 underline"
                    >
                      List a comic on the marketplace
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NFT Action Modal */}
      <NFTActionModal
        comic={selectedComic}
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
