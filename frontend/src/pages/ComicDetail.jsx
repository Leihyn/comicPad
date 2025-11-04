import { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, Eye, Share2, ShoppingCart, Zap, ExternalLink, Rocket } from 'lucide-react';
import comicService from '../services/comicService';
import { useAuth } from '../contexts/AuthContext';
import { WalletConnectContext } from '../contexts/WalletConnectContext';
import { mintNFTs } from '../services/hederaService';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';

// Make toast available globally for the Hedera service
if (typeof window !== 'undefined') {
  window.toast = toast;
}

export default function ComicDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { isConnected } = useContext(WalletConnectContext);
  const [comic, setComic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);

  useEffect(() => {
    loadComic();
  }, [id]);

  const loadComic = async () => {
    try {
      console.log('Loading comic with ID:', id);
      const data = await comicService.getComicById(id);
      console.log('Comic data received:', data);
      setComic(data);
    } catch (error) {
      console.error('Failed to load comic:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to load comic');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToFavorites = async () => {
    try {
      await comicService.addToFavorites(id);
      toast.success('Added to favorites!');
    } catch (error) {
      toast.error('Failed to add to favorites');
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

      // Mint NFTs with wallet (one at a time)
      toast.loading(`Minting ${comic.supply} NFT(s)... (sign each transaction)`, { id: 'mint' });

      const metadataArray = Array(comic.supply).fill(comic.content.metadataUri);
      const tokenId = comic.collection?.collectionTokenId || comic.collection?.tokenId;
      const mintResult = await mintNFTs(tokenId, metadataArray);

      toast.success(`All ${comic.supply} NFT(s) minted successfully! ✅`, { id: 'mint' });

      // Save mint results
      toast.loading('Saving mint results...', { id: 'mint' });

      await axios.post(
        `${API_BASE}/comics/${id}/mint`,
        {
          serialNumbers: mintResult.serials,
          transactionId: mintResult.transactionId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Successfully minted ${comic.supply} NFT(s)! 🎉`, { id: 'mint' });

      // Reload comic data
      await loadComic();
    } catch (error) {
      console.error('Mint error:', error);
      toast.error(error.message || 'Failed to mint NFTs', { id: 'mint' });
    } finally {
      setMinting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Comic not found</p>
      </div>
    );
  }

  const isOwner = user?._id === comic?.creator?._id;
  const isPending = comic?.status === 'pending';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-8 bg-gray-800/50 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl shadow-2xl p-8">
          {/* Cover Image */}
          <div className="md:col-span-2">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition"></div>
              <div className="relative">
                <img
                  src={comic.content?.coverImage || '/placeholder.jpg'}
                  alt={comic.title}
                  className="w-full rounded-lg shadow-2xl aspect-[2/3] object-cover"
                />
                {isPending && (
                  <div className="absolute top-4 right-4 px-4 py-2 bg-yellow-500/90 backdrop-blur rounded-lg font-bold text-black flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    PENDING
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-3">
            <h1 className="text-5xl font-black text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {comic.title}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <Link
                to={`/profile/${comic.creator?._id}`}
                className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                by {comic.creator?.username}
              </Link>
              {comic.series && (
                <span className="px-3 py-1 bg-purple-900/50 border border-purple-500/30 rounded-lg text-purple-300 text-sm font-bold">
                  {comic.series} #{comic.issueNumber}
                </span>
              )}
            </div>

            <p className="text-gray-300 mb-6 leading-relaxed">{comic.description}</p>

            {/* Stats */}
            <div className="flex gap-6 mb-6">
              <div className="flex items-center gap-2 text-gray-300">
                <Eye className="w-5 h-5 text-blue-400" />
                <span className="font-bold">{comic.stats?.views || 0}</span> views
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Heart className="w-5 h-5 text-pink-400" />
                <span className="font-bold">{comic.stats?.favorites || 0}</span> favorites
              </div>
            </div>

            {/* Price Card */}
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-2 border-purple-500/50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300 mb-1">Price</p>
                  <p className="text-4xl font-black text-white">
                    {comic.price} <span className="text-purple-400">HBAR</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-purple-300 mb-1">Available</p>
                  <p className="text-3xl font-black text-white">
                    {comic.supply - comic.minted}<span className="text-purple-400">/{comic.supply}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mb-8">
              {isPending && isOwner ? (
                <button
                  onClick={handleMintNFT}
                  disabled={minting}
                  className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-black text-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <Rocket className="w-6 h-6" />
                  {minting ? 'Minting...' : `Mint ${comic.supply} NFT(s)`}
                </button>
              ) : (
                <>
                  <button className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-black text-xl hover:from-purple-600 hover:to-pink-600 transition flex items-center justify-center gap-2">
                    <ShoppingCart className="w-6 h-6" />
                    Buy Now
                  </button>
                  {isAuthenticated && (
                    <button
                      onClick={handleAddToFavorites}
                      className="px-6 py-4 bg-purple-500/20 border-2 border-purple-500 text-purple-300 rounded-lg hover:bg-purple-500/30 transition"
                    >
                      <Heart className="w-6 h-6" />
                    </button>
                  )}
                  <button className="px-6 py-4 bg-purple-500/20 border-2 border-purple-500 text-purple-300 rounded-lg hover:bg-purple-500/30 transition">
                    <Share2 className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Details Grid */}
            <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
              <h3 className="font-black text-xl text-purple-400 mb-4">COMIC DETAILS</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-purple-300 text-sm mb-1">Genre</p>
                  <p className="font-bold text-white">
                    {comic.genre?.join(', ') || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-purple-300 text-sm mb-1">Pages</p>
                  <p className="font-bold text-white">{comic.pageCount}</p>
                </div>
                <div>
                  <p className="text-purple-300 text-sm mb-1">Edition</p>
                  <p className="font-bold text-white capitalize">{comic.edition}</p>
                </div>
                <div>
                  <p className="text-purple-300 text-sm mb-1">Rarity</p>
                  <p className="font-bold text-white capitalize">{comic.rarity}</p>
                </div>
              </div>
            </div>

            {/* View on Hedera */}
            {comic.collection?.tokenId && (
              <a
                href={`https://hashscan.io/testnet/token/${comic.collection?.collectionTokenId || comic.collection?.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-bold"
              >
                View on HashScan <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}