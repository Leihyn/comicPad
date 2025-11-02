import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { Menu, Search, User, Wallet, LogOut } from 'lucide-react';
import { useState } from 'react';
import Button from '../common/Button';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { isConnected, connectWallet, connecting } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              CP
            </div>
            <span className="text-xl font-bold text-gray-900">Comic Pad</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/explore" className="text-gray-700 hover:text-blue-600 transition">
              Explore
            </Link>
            <Link to="/marketplace" className="text-gray-700 hover:text-blue-600 transition">
              Marketplace
            </Link>
            {isAuthenticated && user?.isCreator && (
              <Link to="/studio" className="text-gray-700 hover:text-blue-600 transition">
                Studio
              </Link>
            )}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search */}
            <button className="p-2 text-gray-600 hover:text-gray-900">
              <Search className="w-5 h-5" />
            </button>

            {isAuthenticated ? (
              <>
                {/* Wallet Button */}
                {!isConnected ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={connectWallet}
                    loading={connecting}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-200">
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {user?.wallet?.accountId?.substring(0, 10)}...
                    </span>
                  </div>
                )}

                {/* Profile Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg">
                    <User className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link 
                      to="/profile" 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </Link>
                    <button 
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t pt-4">
            <div className="flex flex-col space-y-4">
              <Link to="/explore" className="text-gray-700 hover:text-blue-600">
                Explore
              </Link>
              <Link to="/marketplace" className="text-gray-700 hover:text-blue-600">
                Marketplace
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="text-gray-700 hover:text-blue-600">
                    Profile
                  </Link>
                  <button 
                    onClick={logout}
                    className="text-left text-gray-700 hover:text-blue-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-blue-600">
                    Login
                  </Link>
                  <Link to="/register" className="text-gray-700 hover:text-blue-600">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}