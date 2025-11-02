import { Link } from 'react-router-dom';
import { Heart, Eye } from 'lucide-react';

export default function ComicCard({ comic }) {
  return (
    <Link 
      to={`/comic/${comic._id}`}
      className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-gray-200">
        <img
          src={comic.content?.coverImage || '/placeholder-comic.jpg'}
          alt={comic.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-semibold">
          {comic.price} HBAR
        </div>
        {comic.edition !== 'standard' && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-1 rounded text-xs font-bold uppercase">
            {comic.edition}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1 truncate group-hover:text-blue-600 transition">
          {comic.title}
        </h3>
        <p className="text-gray-600 text-sm mb-2">
          by {comic.creator?.username || 'Unknown'}
        </p>
        
        {comic.series && (
          <p className="text-xs text-gray-500 mb-2">
            {comic.series} #{comic.issueNumber}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{comic.stats?.views || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{comic.stats?.favorites || 0}</span>
            </div>
          </div>
          <span className="text-xs font-medium text-blue-600">
            {comic.minted}/{comic.supply} minted
          </span>
        </div>
      </div>
    </Link>
  );
}