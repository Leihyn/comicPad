/*import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useWallet } from './contexts/WalletContext';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Marketplace from './pages/Marketplace';
import ComicDetail from './pages/ComicDetail';
import Profile from './pages/Profile';
import CreatorStudio from './pages/CreatorStudio';
import { Wallet, User, Plus, Zap, Menu, X } from 'lucide-react';
import { useState } from 'react';

function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const { isConnected, connectWallet, wallet, connecting } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Comic-Themed Header */}
      <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-xl border-b-4 border-comic-yellow">
        <div className="absolute inset-0 halftone opacity-30" />
        <nav className="container mx-auto px-6 py-4 relative">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-comic-yellow to-comic-orange rounded-lg flex items-center justify-center font-comic text-2xl text-dark-900 transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(255,215,0,0.5)]">
                  ⚡
                </div>
              </div>
              <div>
                <span className="text-2xl font-comic text-comic-yellow">COMIC PAD</span>
                <div className="text-xs text-comic-orange font-bold">POWERED BY HEDERA</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link 
                to="/explore" 
                className="text-lg font-bold text-white hover:text-comic-yellow transition uppercase tracking-wide"
              >
                Explore
              </Link>
              <Link 
                to="/marketplace" 
                className="text-lg font-bold text-white hover:text-comic-yellow transition uppercase tracking-wide"
              >
                Marketplace
              </Link>
              {isConnected && user?.isCreator && (
                <Link 
                  to="/studio" 
                  className="text-lg font-bold text-white hover:text-comic-yellow transition uppercase tracking-wide"
                >
                  Studio
                </Link>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="hidden md:flex items-center gap-4">
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  disabled={connecting}
                  className="btn-comic flex items-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  {connecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              ) : (
                <>
                  <Link
                    to="/profile"
                    className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg transition flex items-center gap-2 border-2 border-comic-blue"
                  >
                    <User className="w-4 h-4 text-comic-blue" />
                    <span className="text-sm font-mono font-bold text-comic-blue">
                      {wallet?.accountId?.substring(0, 10)}...
                    </span>
                  </Link>
                  {user?.isCreator && (
                    <Link
                      to="/studio/create"
                      className="px-4 py-2 bg-gradient-to-r from-comic-purple to-comic-pink rounded-lg font-bold uppercase flex items-center gap-2 hover:shadow-lg transition"
                    >
                      <Plus className="w-5 h-5" />
                      Create
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="px-4 py-2 bg-dark-800 hover:bg-red-600 rounded-lg transition text-sm font-bold uppercase"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-dark-800 rounded-lg border-2 border-comic-yellow"
            >
              {mobileMenuOpen ? <X className="text-comic-yellow" /> : <Menu className="text-comic-yellow" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 py-4 border-t-2 border-comic-yellow">
              <div className="flex flex-col gap-4">
                <Link to="/explore" className="text-lg font-bold text-white hover:text-comic-yellow uppercase">
                  Explore
                </Link>
                <Link to="/marketplace" className="text-lg font-bold text-white hover:text-comic-yellow uppercase">
                  Marketplace
                </Link>
                {!isConnected ? (
                  <button
                    onClick={connectWallet}
                    className="btn-comic w-full"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <button onClick={logout} className="text-left text-red-500 font-bold uppercase">
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/comic/:id" element={<ComicDetail />} />
          <Route path="/profile/:id?" element={<Profile />} />
          <Route path="/studio/*" element={<CreatorStudio />} />
        </Routes>
      </main>

      {/* Comic-Themed Footer */}
      <footer className="border-t-4 border-comic-yellow mt-20 relative overflow-hidden">
        <div className="absolute inset-0 halftone opacity-20" />
        <div className="container mx-auto px-6 py-12 relative">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-comic-yellow to-comic-orange rounded-lg flex items-center justify-center font-comic text-xl text-dark-900">
                  ⚡
                </div>
                <span className="font-comic text-xl text-comic-yellow">COMIC PAD</span>
              </div>
              <p className="text-gray-400 text-sm">
                Decentralized comic book publishing powered by Hedera Hashgraph
              </p>
            </div>
            <div>
              <h4 className="font-bold text-comic-yellow mb-4 uppercase">Product</h4>
              <div className="flex flex-col gap-2 text-sm text-gray-400">
                <Link to="/explore" className="hover:text-comic-yellow transition">Explore Comics</Link>
                <Link to="/marketplace" className="hover:text-comic-yellow transition">Marketplace</Link>
                <a href="#" className="hover:text-comic-yellow transition">Become a Creator</a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-comic-yellow mb-4 uppercase">Resources</h4>
              <div className="flex flex-col gap-2 text-sm text-gray-400">
                <a href="#" className="hover:text-comic-yellow transition">Documentation</a>
                <a href="#" className="hover:text-comic-yellow transition">Whitepaper</a>
                <a href="#" className="hover:text-comic-yellow transition">API Reference</a>
                <a href="#" className="hover:text-comic-yellow transition">Support</a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-comic-yellow mb-4 uppercase">Community</h4>
              <div className="flex flex-col gap-2 text-sm text-gray-400">
                <a href="#" className="hover:text-comic-yellow transition">Twitter</a>
                <a href="#" className="hover:text-comic-yellow transition">Discord</a>
                <a href="#" className="hover:text-comic-yellow transition">GitHub</a>
                <a href="#" className="hover:text-comic-yellow transition">Blog</a>
              </div>
            </div>
          </div>
          <div className="border-t-2 border-dark-700 mt-12 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © 2025 Comic Pad. All rights reserved. Built with ⚡ on Hedera
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;*/