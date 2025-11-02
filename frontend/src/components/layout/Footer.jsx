import { Link } from 'react-router-dom';
import { Twitter, Github, Discord } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                CP
              </div>
              <span className="text-xl font-bold text-white">Comic Pad</span>
            </div>
            <p className="text-sm text-gray-400">
              Decentralized comic book publishing platform powered by Hedera.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-white font-semibold mb-4">Explore</h3>
            <ul className="space-y-2">
              <li><Link to="/explore" className="hover:text-white">Browse Comics</Link></li>
              <li><Link to="/marketplace" className="hover:text-white">Marketplace</Link></li>
              <li><Link to="/creators" className="hover:text-white">Creators</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-white">Documentation</a></li>
              <li><a href="#" className="hover:text-white">Whitepaper</a></li>
              <li><a href="#" className="hover:text-white">API</a></li>
              <li><a href="#" className="hover:text-white">Help Center</a></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white font-semibold mb-4">Community</h3>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-white">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="#" className="hover:text-white">
                <Discord className="w-6 h-6" />
              </a>
              <a href="#" className="hover:text-white">
                <Github className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2025 Comic Pad. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}