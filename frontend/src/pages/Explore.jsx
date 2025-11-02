import { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, Star, Eye, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import comicService from '../services/comicService';
import FloatingComicBackground from '../components/common/FloatingComicBackground';

export default function Explore() {
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');

  const genres = ['all', 'superhero', 'manga', 'horror', 'sci-fi', 'fantasy', 'indie'];

  useEffect(() => {
    loadComics();
  }, [selectedGenre]);

  const loadComics = async () => {
    setLoading(true);
    try {
      const params = selectedGenre !== 'all' ? { category: selectedGenre } : {};
      const data = await comicService.getComics(params);
      console.log('Loaded comics:', data);
      setComics(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load comics error:', error);
      setComics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results = await comicService.searchComics(searchQuery);
      console.log('Search results:', results);
      setComics(results.comics || []);
    } catch (error) {
      console.error('Search error:', error);
      setComics([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative container mx-auto px-6 py-12">
      {/* Floating Comic Background */}
      <FloatingComicBackground />

      {/* Header with Comic Style */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl md:text-7xl font-comic text-comic-yellow mb-4 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.8)]">
          EXPLORE COMICS! 🦸
        </h1>
        <p className="text-xl text-gray-400 font-bold">
          Discover amazing comics from creators worldwide!
        </p>
      </div>

      {/* Search Bar - Comic Styled */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="max-w-3xl mx-auto relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-comic-yellow" />
          <input
            type="text"
            placeholder="Search comics, creators, series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-32 py-5 bg-dark-800 border-4 border-comic-yellow rounded-2xl focus:outline-none focus:border-comic-orange transition text-lg font-bold text-white placeholder-gray-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 bg-gradient-to-r from-comic-yellow to-comic-orange text-dark-900 rounded-xl font-bold uppercase hover:shadow-lg transition"
          >
            Search
          </button>
        </div>
      </form>

      {/* Genre Filters */}
      <div className="flex flex-wrap gap-3 justify-center mb-12">
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`px-6 py-3 rounded-xl font-bold uppercase transition transform hover:scale-105 ${
              selectedGenre === genre
                ? 'bg-gradient-to-r from-comic-yellow to-comic-orange text-dark-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]'
                : 'bg-dark-800 text-gray-400 border-2 border-dark-600 hover:border-comic-yellow hover:text-white'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Comics Grid */}
      {loading ? (
        <div className="grid md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] bg-dark-800 rounded-xl animate-pulse border-4 border-dark-700"
            />
          ))}
        </div>
      ) : comics.length > 0 ? (
        <div className="grid md:grid-cols-4 gap-6">
          {comics.map((comic) => (
            <ComicCard key={comic._id} comic={comic} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-8xl mb-6">📚</div>
          <h3 className="text-3xl font-comic text-comic-yellow mb-4">NO COMICS FOUND!</h3>
          <p className="text-xl text-gray-400 mb-8">Be the first hero to publish a comic!</p>
          <Link to="/studio/create" className="btn-comic">
            CREATE COMIC 🚀
          </Link>
        </div>
      )}
    </div>
  );
}

function ComicCard({ comic }) {
  return (
    <Link to={`/comic/${comic._id}`} className="group">
      <div className="comic-card animate-pop">
        {/* Cover Image */}
        <div className="aspect-[2/3] relative overflow-hidden bg-gradient-to-br from-comic-purple/30 to-comic-pink/30">
          <img
            src={comic.content?.coverImage || 'https://via.placeholder.com/400x600/1a1a1a/FFD700?text=COMIC'}
            alt={comic.title}
            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
          />
          
          {/* Price Badge */}
          <div className="absolute top-3 right-3 px-4 py-2 bg-comic-yellow text-dark-900 rounded-lg font-comic text-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] transform rotate-3">
            {comic.price} HBAR
          </div>
          
          {/* Edition Badge */}
          {comic.edition !== 'standard' && (
            <div className="absolute top-3 left-3 px-3 py-1 bg-comic-red text-white rounded-lg font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)]">
              {comic.edition}
            </div>
          )}
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <div className="text-white">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {comic.stats?.views || 0}
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {comic.stats?.favorites || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Comic Info */}
        <div className="p-4 bg-dark-800">
          <h3 className="font-bold text-lg mb-1 text-white group-hover:text-comic-yellow transition truncate">
            {comic.title}
          </h3>
          <p className="text-sm text-gray-400 mb-2">
            by {comic.creator?.username || 'Unknown'}
          </p>
          
          {comic.series && (
            <div className="text-xs text-comic-orange font-bold">
              {comic.series} #{comic.issueNumber}
            </div>
          )}
          
          {/* Minted Count */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {comic.minted}/{comic.supply} minted
            </span>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < (comic.stats?.averageRating || 0)
                      ? 'text-comic-yellow fill-comic-yellow'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}