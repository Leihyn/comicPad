import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, DollarSign, Users, Zap, Rocket, TrendingUp, Sparkles, Palette, Eye, Star } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-purple-900 to-dark-900 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 text-6xl animate-float">🎨</div>
        <div className="absolute top-40 right-20 text-6xl animate-float" style={{ animationDelay: '1s' }}>✨</div>
        <div className="absolute bottom-20 left-1/4 text-6xl animate-float" style={{ animationDelay: '2s' }}>🚀</div>

        <div className="text-center max-w-md relative z-10 animate-fade-in-up">
          <div className="text-6xl mb-6 animate-bounce">🔒</div>
          <h1 className="text-4xl font-black text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Connect Wallet
          </h1>
          <p className="text-gray-300 mb-6">Please connect your wallet to access Creator Studio</p>
          <Link
            to="/"
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition inline-block shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-purple-900 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🚀</div>
          <p className="text-white text-2xl font-bold">Loading Creator Studio...</p>
          <div className="mt-4 flex justify-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-purple-900 to-dark-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 halftone"></div>
      </div>

      {/* Floating Comic Icons */}
      <div className="absolute top-20 left-10 text-5xl animate-float opacity-20">🎨</div>
      <div className="absolute top-40 right-20 text-5xl animate-float opacity-20" style={{ animationDelay: '1s' }}>✨</div>
      <div className="absolute bottom-40 left-1/4 text-5xl animate-float opacity-20" style={{ animationDelay: '2s' }}>💡</div>
      <div className="absolute top-1/2 right-10 text-5xl animate-float opacity-20" style={{ animationDelay: '3s' }}>🌟</div>
      <div className="absolute bottom-20 right-1/3 text-5xl animate-float opacity-20" style={{ animationDelay: '1.5s' }}>🎪</div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Hero Header */}
        <div className="mb-12 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="mb-6 md:mb-0">
              <div className="inline-block mb-4">
                <div className="badge-pow animate-pop">
                  <Sparkles className="inline w-4 h-4 mr-2" />
                  CREATOR DASHBOARD
                </div>
              </div>
              <h1 className="text-6xl md:text-7xl font-black text-white mb-2 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  CREATOR STUDIO
                </span>
              </h1>
              <p className="text-2xl text-gray-300 font-bold">
                Welcome back, <span className="text-purple-400">{user?.username}</span>! 👋
              </p>
            </div>
            <Link
              to="/studio/create"
              className="px-10 py-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-black text-xl hover:from-green-600 hover:to-emerald-600 transition-all inline-flex items-center gap-3 justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1 border-4 border-dark-900 animate-pulse-glow"
            >
              <Plus className="w-7 h-7" />
              CREATE COMIC
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gray-800/70 backdrop-blur-xl border-4 border-purple-500/50 rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all animate-slide-in-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm font-black mb-2 tracking-wide">TOTAL COMICS</p>
                <p className="text-5xl font-black text-white mb-1">{comics.length}</p>
                <p className="text-xs text-gray-400 font-bold">{publishedComics} published</p>
              </div>
              <div className="relative">
                <BookOpen className="w-20 h-20 text-purple-500 opacity-30" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full animate-ping"></div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/70 backdrop-blur-xl border-4 border-blue-500/50 rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-black mb-2 tracking-wide">COLLECTIONS</p>
                <p className="text-5xl font-black text-white mb-1">{collections.length}</p>
                <p className="text-xs text-gray-400 font-bold">{collections.length} active</p>
              </div>
              <div className="relative">
                <TrendingUp className="w-20 h-20 text-blue-500 opacity-30" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/70 backdrop-blur-xl border-4 border-green-500/50 rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm font-black mb-2 tracking-wide">TOTAL MINTED</p>
                <p className="text-5xl font-black text-white mb-1">{totalMinted}</p>
                <p className="text-xs text-gray-400 font-bold">NFTs created</p>
              </div>
              <div className="relative">
                <Zap className="w-20 h-20 text-green-500 opacity-30" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/70 backdrop-blur-xl border-4 border-yellow-500/50 rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all animate-slide-in-left" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-300 text-sm font-black mb-2 tracking-wide">EARNINGS</p>
                <p className="text-5xl font-black text-white mb-1">0</p>
                <p className="text-xs text-gray-400 font-bold">HBAR earned</p>
              </div>
              <div className="relative">
                <DollarSign className="w-20 h-20 text-yellow-500 opacity-30" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full animate-ping" style={{ animationDelay: '0.9s' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800/70 backdrop-blur-xl border-4 border-purple-500/50 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] p-10 mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-8">
            <Rocket className="w-8 h-8 text-purple-400" />
            <h2 className="text-3xl font-black text-white">QUICK ACTIONS</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/studio/create"
              className="group p-8 bg-purple-900/40 border-4 border-purple-500/50 rounded-2xl hover:bg-purple-900/60 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.6)] hover:-translate-y-1"
            >
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🎨</div>
              <Palette className="w-10 h-10 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-black text-white text-xl mb-2">Create New Comic</h3>
              <p className="text-sm text-gray-400 font-semibold">Start your next masterpiece</p>
            </Link>

            <Link
              to="/profile"
              className="group p-8 bg-blue-900/40 border-4 border-blue-500/50 rounded-2xl hover:bg-blue-900/60 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.6)] hover:-translate-y-1"
            >
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">👤</div>
              <Users className="w-10 h-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-black text-white text-xl mb-2">View Profile</h3>
              <p className="text-sm text-gray-400 font-semibold">See your public profile</p>
            </Link>

            <Link
              to="/settings"
              className="group p-8 bg-pink-900/40 border-4 border-pink-500/50 rounded-2xl hover:bg-pink-900/60 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.6)] hover:-translate-y-1"
            >
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
              <Zap className="w-10 h-10 text-pink-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-black text-white text-xl mb-2">Edit Profile</h3>
              <p className="text-sm text-gray-400 font-semibold">Update your details</p>
            </Link>
          </div>
        </div>

        {/* Recent Comics */}
        <div className="bg-gray-800/70 backdrop-blur-xl border-4 border-purple-500/50 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] p-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3 mb-8">
            <Star className="w-8 h-8 text-purple-400" />
            <h2 className="text-3xl font-black text-white">RECENT COMICS</h2>
          </div>
          {comics.length > 0 ? (
            <div className="grid md:grid-cols-4 gap-6">
              {comics.slice(0, 4).map((comic, index) => (
                <Link
                  key={comic._id}
                  to={`/comic/${comic._id}`}
                  className="group relative bg-gray-700/50 rounded-2xl overflow-hidden border-4 border-purple-500/30 hover:border-purple-500 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-[6px_6px_0px_0px_rgba(168,85,247,0.6)] hover:scale-105 animate-fade-in-up"
                  style={{ animationDelay: `${0.1 * (index + 1)}s` }}
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/0 to-purple-500/0 group-hover:from-purple-500/20 group-hover:via-transparent group-hover:to-transparent transition-all duration-300"></div>

                  <div className="aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900 relative">
                    {comic.content?.coverImage ? (
                      <img
                        src={comic.content.coverImage}
                        alt={comic.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        📚
                      </div>
                    )}
                    {/* Status badge */}
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-black border-2 ${
                      comic.status === 'published'
                        ? 'bg-green-500 text-white border-green-700'
                        : 'bg-yellow-500 text-black border-yellow-700'
                    }`}>
                      {comic.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="p-5 relative">
                    <h3 className="font-black text-white text-lg mb-2 truncate group-hover:text-purple-400 transition-colors">
                      {comic.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {comic.views || 0}
                      </span>
                      <span>{comic.minted || 0} minted</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 animate-fade-in-up">
              <div className="text-8xl mb-6 animate-bounce">🎨</div>
              <h3 className="text-2xl font-black text-white mb-3">No Comics Yet</h3>
              <p className="text-gray-400 mb-8 text-lg">Start creating your first comic masterpiece!</p>
              <Link
                to="/studio/create"
                className="px-10 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-black text-lg hover:from-purple-600 hover:to-pink-600 transition-all inline-flex items-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1 border-4 border-dark-900"
              >
                <Plus className="w-6 h-6" />
                Create Your First Comic
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
