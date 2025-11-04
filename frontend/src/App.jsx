import { Routes, Route, Link } from 'react-router-dom';
import { Wallet, Menu, X } from 'lucide-react';
import { useState, useContext } from 'react';
import { WalletConnectContext } from './contexts/WalletConnectContext';
import { openHashPackModal, hashPackWallet } from './services/wallets/hashpackClient';

// Import all pages
import Home from './pages/Home';
import TestHome from './pages/TestHome';
import Explore from './pages/Explore';
import Marketplace from './pages/MarketplaceEnhanced';
import MarketplaceHistory from './pages/MarketplaceHistory';
import ComicDetail from './pages/ComicDetailEnhanced';
import EnhancedReader from './pages/EnhancedReader';
import Collection from './pages/Collection';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import CreatorStudio from './pages/CreatorStudio';
import CreateComic from './pages/CreateComic';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { accountId, isConnected } = useContext(WalletConnectContext);

  const connect = async () => {
    setIsLoading(true);
    try {
      console.log('🔵 Starting wallet connection...');
      await openHashPackModal();
      console.log('✅ Wallet connection completed');
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      // Don't show error toast here, it's already shown in openHashPackModal
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    hashPackWallet.disconnect();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Comic Header with Halftone Effect */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-xl border-b-4 border-yellow-400 shadow-[0_4px_20px_rgba(255,215,0,0.3)]">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '8px 8px'
        }} />

        <nav className="container mx-auto px-6 py-4 relative">
          <div className="flex items-center justify-between">
            {/* Logo with Shadow */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50 group-hover:opacity-75 transition"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center text-2xl transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
                  ⚡
                </div>
              </div>
              <div>
                <span className="text-2xl font-black text-yellow-400 tracking-wider" style={{
                  textShadow: '3px 3px 0px rgba(0,0,0,0.8), 6px 6px 0px rgba(255,69,0,0.4)'
                }}>
                  COMIC PAD
                </span>
                <div className="text-[10px] text-orange-500 font-bold tracking-widest -mt-1">
                  POWERED BY HEDERA
                </div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/explore"
                className="text-lg font-black text-white hover:text-yellow-400 transition uppercase tracking-wider relative group"
              >
                EXPLORE
                <span className="absolute bottom-0 left-0 w-0 h-1 bg-yellow-400 group-hover:w-full transition-all"></span>
              </Link>
              <Link
                to="/marketplace"
                className="text-lg font-black text-white hover:text-yellow-400 transition uppercase tracking-wider relative group"
              >
                MARKETPLACE
                <span className="absolute bottom-0 left-0 w-0 h-1 bg-yellow-400 group-hover:w-full transition-all"></span>
              </Link>
              <Link
                to="/creator-studio"
                className="text-lg font-black text-white hover:text-yellow-400 transition uppercase tracking-wider relative group"
              >
                CREATE
                <span className="absolute bottom-0 left-0 w-0 h-1 bg-yellow-400 group-hover:w-full transition-all"></span>
              </Link>

              {!isConnected ? (
                <button
                  onClick={connect}
                  disabled={isLoading}
                  className="relative px-6 py-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-black rounded-lg font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150 flex items-center gap-2 group"
                >
                  <Wallet className="w-5 h-5 group-hover:rotate-12 transition" />
                  {isLoading ? 'CONNECTING...' : 'CONNECT WALLET'}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/profile"
                    className="px-4 py-2 bg-[#1A1A1A] border-2 border-cyan-400 rounded-lg font-mono text-cyan-400 font-bold shadow-[0_0_10px_rgba(0,255,255,0.3)] hover:bg-cyan-400 hover:text-black transition"
                  >
                    {accountId?.substring(0, 10)}...
                  </Link>
                  <button
                    onClick={disconnect}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold uppercase transition"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-[#2A2A2A] rounded-lg border-2 border-yellow-400"
            >
              {mobileMenuOpen ? <X className="text-yellow-400" /> : <Menu className="text-yellow-400" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 py-4 border-t-2 border-yellow-400">
              <div className="flex flex-col gap-4">
                <Link to="/explore" className="text-white hover:text-yellow-400 font-bold uppercase">Explore</Link>
                <Link to="/marketplace" className="text-white hover:text-yellow-400 font-bold uppercase">Marketplace</Link>
                <Link to="/creator-studio" className="text-white hover:text-yellow-400 font-bold uppercase">Create</Link>
                {isConnected && (
                  <>
                    <Link to="/profile" className="text-white hover:text-yellow-400 font-bold uppercase">Profile</Link>
                    <Link to="/collection" className="text-white hover:text-yellow-400 font-bold uppercase">My Collection</Link>
                  </>
                )}
                {!isConnected ? (
                  <button onClick={connect} disabled={isLoading} className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-lg font-bold uppercase">
                    {isLoading ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                ) : (
                  <button onClick={disconnect} className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold uppercase">
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main */}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/history" element={<MarketplaceHistory />} />
          <Route path="/comic/:id" element={<ComicDetail />} />
          <Route path="/reader/:id" element={<EnhancedReader />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/creator-studio" element={<CreatorStudio />} />
          <Route path="/studio/create" element={<CreateComic />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Comic Footer */}
      <footer className="relative border-t-4 border-yellow-400 mt-20 bg-[#0A0A0A] overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '8px 8px'
        }} />

        <div className="container mx-auto px-6 py-12 relative">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">
                  ⚡
                </div>
                <span className="text-xl font-black text-yellow-400">COMIC PAD</span>
              </div>
              <p className="text-gray-400 text-sm">
                Decentralized comic book publishing powered by Hedera Hashgraph
              </p>
            </div>

            <div>
              <h4 className="font-black text-yellow-400 mb-4 uppercase tracking-wider">Product</h4>
              <div className="flex flex-col gap-2 text-sm text-gray-400">
                <Link to="/explore" className="hover:text-yellow-400 transition">Explore Comics</Link>
                <Link to="/marketplace" className="hover:text-yellow-400 transition">Marketplace</Link>
                <Link to="/creator-studio" className="hover:text-yellow-400 transition">Become a Creator</Link>
              </div>
            </div>

            <div>
              <h4 className="font-black text-yellow-400 mb-4 uppercase tracking-wider">Resources</h4>
              <div className="flex flex-col gap-2 text-sm text-gray-400">
                <a href="#" className="hover:text-yellow-400 transition">Documentation</a>
                <a href="#" className="hover:text-yellow-400 transition">Whitepaper</a>
                <a href="#" className="hover:text-yellow-400 transition">API</a>
              </div>
            </div>

            <div>
              <h4 className="font-black text-yellow-400 mb-4 uppercase tracking-wider">Community</h4>
              <div className="flex flex-col gap-2 text-sm text-gray-400">
                <a href="#" className="hover:text-yellow-400 transition">Twitter</a>
                <a href="#" className="hover:text-yellow-400 transition">Discord</a>
                <a href="#" className="hover:text-yellow-400 transition">GitHub</a>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-[#2A2A2A] pt-8 text-center text-sm text-gray-500">
            © 2025 Comic Pad. Built with ⚡ on Hedera Hashgraph
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
