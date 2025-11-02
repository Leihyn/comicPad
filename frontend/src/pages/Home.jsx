import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Globe, Star, Rocket, Wallet } from 'lucide-react';
import { WalletConnectContext } from '../contexts/WalletConnectContext';
import { openHashPackModal } from '../services/wallets/hashpackClient';
import { statsAPI } from '../services/api';
import FloatingComicBackground from '../components/common/FloatingComicBackground';

export default function Home() {
  const { isConnected } = useContext(WalletConnectContext);
  const [connecting, setConnecting] = useState(false);
  const [stats, setStats] = useState({ totalComics: 0, totalVolume: 0, totalCreators: 0, totalCollectors: 0 });
  const [activeComicIndex, setActiveComicIndex] = useState(0);

  // Featured comics from API
  const [featuredComics, setFeaturedComics] = useState([]);

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await statsAPI.getPlatformStats();
        if (data && data.data) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    const fetchComics = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/v1/comics?limit=5&sortBy=createdAt&order=desc&status=published');
        const data = await response.json();
        console.log('Featured comics response:', data);

        const comicsArray = data.data?.comics || data.comics || [];

        if (comicsArray.length > 0) {
          setFeaturedComics(comicsArray.map(comic => ({
            title: comic.title,
            cover: comic.content?.coverImage || 'https://via.placeholder.com/400x600?text=Comic',
            creator: comic.creator?.username || 'Anonymous',
            price: `${comic.price} HBAR`,
            id: comic._id
          })));
        }
      } catch (error) {
        console.error('Failed to fetch comics:', error);
      }
    };

    fetchStats();
    fetchComics();
  }, []);

  // Auto-rotate comics every 4 seconds
  useEffect(() => {
    if (featuredComics.length === 0) return;
    const interval = setInterval(() => {
      setActiveComicIndex((prev) => (prev + 1) % featuredComics.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredComics.length]);


  return (
    <div className="relative">
      {/* Floating Comic Background */}
      <FloatingComicBackground />

      {/* Hero Section - Comic Book Style */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-comic-red/20 via-dark-900 to-comic-blue/20" />
        <div className="absolute inset-0 halftone opacity-20" />

        {/* Rotating Comic Covers in Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="grid grid-cols-5 gap-8 -rotate-12 scale-150">
            {featuredComics.map((comic, index) => (
              <div
                key={index}
                className={`relative transition-all duration-1000 ${
                  index === activeComicIndex ? 'scale-125 opacity-100 z-10' : 'opacity-40'
                }`}
                style={{
                  transform: `translateY(${index * 20}px)`,
                  transitionDelay: `${index * 0.1}s`
                }}
              >
                <img
                  src={comic.cover}
                  alt={comic.title}
                  className="w-48 h-72 object-cover rounded-lg shadow-2xl border-4 border-yellow-400"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 text-6xl animate-float z-20">💥</div>
        <div className="absolute top-40 right-20 text-6xl animate-float z-20" style={{ animationDelay: '1s' }}>⚡</div>
        <div className="absolute bottom-20 left-1/4 text-6xl animate-float z-20" style={{ animationDelay: '2s' }}>💫</div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-block mb-8">
              <div className="badge-pow animate-pop">
                <Zap className="inline w-5 h-5 mr-2" />
                POWERED BY HEDERA
              </div>
            </div>
            
            {/* Main Heading */}
            <h1 className="font-comic text-6xl md:text-8xl mb-8 leading-tight">
              <span className="block text-comic-yellow drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
                PUBLISH!
              </span>
              <span className="block text-comic-orange drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
                COLLECT!
              </span>
              <span className="block text-comic-red drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
                OWN FOREVER!
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto font-bold">
              The ultimate decentralized platform for comic creators and collectors. 
              Create, mint, and trade comic book NFTs with <span className="text-comic-yellow">ZERO GAS FEES!</span>
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  disabled={connecting}
                  className="btn-comic text-xl flex items-center justify-center gap-3 group"
                >
                  <Wallet className="w-6 h-6" />
                  {connecting ? 'Connecting...' : 'Connect HashPack'}
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition" />
                </button>
              ) : (
                <Link
                  to="/explore"
                  className="btn-comic text-xl flex items-center justify-center gap-3 group"
                >
                  <Rocket className="w-6 h-6" />
                  Start Exploring
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition" />
                </Link>
              )}
              <Link
                to="/marketplace"
                className="btn-comic-outline text-xl flex items-center justify-center gap-3"
              >
                <Star className="w-6 h-6" />
                View Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Comics Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-comic text-comic-yellow mb-4">
            FEATURED COMICS 🔥
          </h2>
          <p className="text-xl text-gray-400">Check out the hottest releases from our creators!</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {featuredComics.map((comic, index) => (
            <Link
              key={index}
              to={`/comic/${comic.id}`}
              className={`group relative transform transition-all duration-500 hover:scale-105 ${
                index === activeComicIndex ? 'ring-4 ring-yellow-400 scale-105' : ''
              }`}
            >
              <div className="relative overflow-hidden rounded-lg shadow-2xl border-4 border-gray-800 hover:border-yellow-400 transition-colors">
                <img
                  src={comic.cover}
                  alt={comic.title}
                  className="w-full h-80 object-cover transform group-hover:scale-110 transition-transform duration-500"
                />

                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h3 className="text-white font-bold text-lg mb-1">{comic.title}</h3>
                  <p className="text-yellow-400 text-sm mb-1">{comic.creator}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold">{comic.price}</span>
                    <span className="px-3 py-1 bg-yellow-400 text-black rounded font-bold text-sm hover:bg-yellow-500 transition">
                      VIEW
                    </span>
                  </div>
                </div>

                {/* Active Indicator */}
                {index === activeComicIndex && (
                  <div className="absolute top-2 right-2 bg-yellow-400 text-black px-3 py-1 rounded-full font-bold text-xs animate-pulse">
                    HOT! 🔥
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* View More Button */}
        <div className="text-center mt-12">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-lg font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Explore More Comics
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl md:text-5xl font-comic text-center mb-16 text-comic-yellow">
          SUPER POWERS! 💪
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Zap className="w-12 h-12" />,
              title: 'LIGHTNING FAST',
              desc: 'Instant transactions with near-zero fees on Hedera network',
              color: 'from-comic-yellow to-comic-orange',
              emoji: '⚡'
            },
            {
              icon: <Shield className="w-12 h-12" />,
              title: 'TRUE OWNERSHIP',
              desc: 'Your comics, your NFTs, permanently stored on blockchain',
              color: 'from-comic-blue to-comic-purple',
              emoji: '🛡️'
            },
            {
              icon: <Globe className="w-12 h-12" />,
              title: 'GLOBAL REACH',
              desc: 'Connect with collectors and creators from around the world',
              color: 'from-comic-green to-comic-cyan',
              emoji: '🌍'
            }
          ].map((feature, i) => (
            <div
              key={i}
              className="comic-panel p-8 group hover:scale-105 transition-transform duration-300"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 text-4xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] group-hover:animate-shake`}>
                {feature.emoji}
              </div>
              <h3 className="text-2xl font-comic text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="comic-panel p-12 border-animated">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Comics Published', value: '1,234', icon: '📚' },
              { label: 'Total Sales', value: '50K HBAR', icon: '💰' },
              { label: 'Creators', value: '567', icon: '✍️' },
              { label: 'Collectors', value: '2,890', icon: '👥' }
            ].map((stat, i) => (
              <div key={i} className="group hover:scale-110 transition">
                <div className="text-5xl mb-2">{stat.icon}</div>
                <div className="text-4xl font-comic text-comic-yellow mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400 font-bold uppercase text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl md:text-5xl font-comic text-center mb-16 text-comic-yellow">
          HOW IT WORKS! 🚀
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'CONNECT WALLET', desc: 'Link your HashPack wallet to get started', emoji: '🔗' },
            { step: '2', title: 'CREATE OR COLLECT', desc: 'Publish your comics or discover amazing art', emoji: '🎨' },
            { step: '3', title: 'TRADE & EARN', desc: 'Buy, sell, and earn royalties forever', emoji: '💎' }
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-comic-purple to-comic-pink rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-comic text-white border-4 border-dark-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
                {item.step}
              </div>
              <div className="text-5xl mb-4">{item.emoji}</div>
              <h3 className="text-2xl font-comic text-comic-yellow mb-2">{item.title}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="comic-panel p-16 text-center bg-gradient-to-br from-comic-red/20 to-comic-purple/20">
          <h2 className="text-5xl md:text-6xl font-comic text-comic-yellow mb-6 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
            READY TO UNLEASH YOUR CREATIVITY?
          </h2>
          <p className="text-2xl text-gray-300 mb-10 font-bold">
            Join the future of comic book publishing TODAY! 💪
          </p>
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="btn-comic text-2xl"
          >
            {connecting ? 'CONNECTING...' : 'BECOME A CREATOR NOW! 🚀'}
          </button>
        </div>
      </section>
    </div>
  );
}