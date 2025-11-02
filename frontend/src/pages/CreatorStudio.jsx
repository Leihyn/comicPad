import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, DollarSign, Users, Zap, Rocket, TrendingUp } from 'lucide-react';
import { WalletConnectContext } from '../contexts/WalletConnectContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:3001/api/v1';

export default function CreatorStudio() {
  const { isConnected, accountId } = useContext(WalletConnectContext);
  const [user, setUser] = useState(null);
  const [comics, setComics] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && accountId) {
      loadData();
    }
  }, [isConnected, accountId]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Load user profile
      const userResponse = await axios.get(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(userResponse.data.data.user);

      // Load comics
      const comicsResponse = await axios.get(`${API_BASE}/comics/creator/my-comics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComics(comicsResponse.data.data.comics || []);

      // Load collections
      const collectionsResponse = await axios.get(`${API_BASE}/comics/collections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollections(collectionsResponse.data.data.collections || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load creator data');
    } finally {
      setLoading(false);
    }
  };

  const totalMinted = comics.reduce((sum, comic) => sum + comic.minted, 0);
  const publishedComics = comics.filter(c => c.status === 'published').length;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-4">Connect Wallet</h1>
          <p className="text-gray-300 mb-6">Please connect your wallet to access Creator Studio</p>
          <Link
            to="/"
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition inline-block"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🚀</div>
          <p className="text-white text-2xl">Loading Creator Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              CREATOR STUDIO
            </h1>
            <p className="text-gray-300">Welcome back, {user?.username}!</p>
          </div>
          <Link
            to="/studio/create"
            className="mt-4 md:mt-0 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-black text-xl hover:from-green-600 hover:to-emerald-600 transition inline-flex items-center gap-2 justify-center"
          >
            <Plus className="w-6 h-6" />
            Create Comic
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm font-bold mb-2">TOTAL COMICS</p>
                <p className="text-4xl font-black text-white">{comics.length}</p>
                <p className="text-xs text-gray-400 mt-1">{publishedComics} published</p>
              </div>
              <BookOpen className="w-16 h-16 text-purple-500 opacity-30" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl border-2 border-blue-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-bold mb-2">COLLECTIONS</p>
                <p className="text-4xl font-black text-white">{collections.length}</p>
                <p className="text-xs text-gray-400 mt-1">{collections.length} active</p>
              </div>
              <TrendingUp className="w-16 h-16 text-blue-500 opacity-30" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl border-2 border-green-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm font-bold mb-2">TOTAL MINTED</p>
                <p className="text-4xl font-black text-white">{totalMinted}</p>
                <p className="text-xs text-gray-400 mt-1">NFTs created</p>
              </div>
              <Zap className="w-16 h-16 text-green-500 opacity-30" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl border-2 border-yellow-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 text-sm font-bold mb-2">EARNINGS</p>
                <p className="text-4xl font-black text-white">0</p>
                <p className="text-xs text-gray-400 mt-1">HBAR earned</p>
              </div>
              <DollarSign className="w-16 h-16 text-yellow-500 opacity-30" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800/50 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl shadow-2xl p-8 mb-8">
          <h2 className="text-2xl font-black text-purple-400 mb-6">QUICK ACTIONS</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              to="/studio/create"
              className="p-6 bg-purple-900/30 border-2 border-purple-500/50 rounded-xl hover:bg-purple-900/50 transition group"
            >
              <Rocket className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition" />
              <h3 className="font-bold text-white mb-2">Create New Comic</h3>
              <p className="text-sm text-gray-400">Start your next masterpiece</p>
            </Link>

            <Link
              to="/profile"
              className="p-6 bg-blue-900/30 border-2 border-blue-500/50 rounded-xl hover:bg-blue-900/50 transition group"
            >
              <Users className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition" />
              <h3 className="font-bold text-white mb-2">View Profile</h3>
              <p className="text-sm text-gray-400">See your public profile</p>
            </Link>

            <Link
              to="/settings"
              className="p-6 bg-pink-900/30 border-2 border-pink-500/50 rounded-xl hover:bg-pink-900/50 transition group"
            >
              <Zap className="w-8 h-8 text-pink-400 mb-3 group-hover:scale-110 transition" />
              <h3 className="font-bold text-white mb-2">Edit Profile</h3>
              <p className="text-sm text-gray-400">Update your details</p>
            </Link>
          </div>
        </div>

        {/* Recent Comics */}
        <div className="bg-gray-800/50 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-black text-purple-400 mb-6">RECENT COMICS</h2>
          {comics.length > 0 ? (
            <div className="grid md:grid-cols-4 gap-6">
              {comics.slice(0, 4).map((comic) => (
                <Link
                  key={comic._id}
                  to={`/comic/${comic._id}`}
                  className="group relative bg-gray-700/50 rounded-lg overflow-hidden border-2 border-purple-500/30 hover:border-purple-500 transition shadow-lg hover:scale-105"
                >
                  <div className="aspect-[2/3] bg-gray-800">
                    {comic.content?.coverImage ? (
                      <img
                        src={comic.content.coverImage}
                        alt={comic.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white mb-1 truncate">{comic.title}</h3>
                    <p className="text-xs text-gray-400">{comic.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
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
      </div>
    </div>
  );
}