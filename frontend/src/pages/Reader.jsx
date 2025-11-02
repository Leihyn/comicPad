import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Maximize, ZoomIn, ZoomOut, X, BookOpen } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';

export default function Reader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comic, setComic] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    loadComic();
  }, [id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === 'Escape') setFullscreen(false);
      if (e.key === 'f' || e.key === 'F') setFullscreen(prev => !prev);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, comic]);

  const loadComic = async () => {
    try {
      console.log('Loading comic for reader with ID:', id);
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('Please login to read comics');
        navigate('/login');
        return;
      }

      // Use the reader endpoint that checks NFT ownership
      const response = await axios.get(`${API_BASE}/reader/comics/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('API Response:', response.data);
      const comicData = response.data.data?.comic || response.data.comic;
      const progress = response.data.data?.progress;

      if (!comicData) {
        throw new Error('Comic data not found in response');
      }

      console.log('Comic data loaded:', comicData);
      console.log('Reading progress:', progress);

      // Set current page from progress
      if (progress && progress.currentPage > 0) {
        setCurrentPage(progress.currentPage - 1); // Convert to 0-index
      }

      setComic(comicData);
    } catch (error) {
      console.error('Failed to load comic:', error);
      console.error('Error details:', error.response?.data || error.message);

      if (error.response?.status === 403) {
        toast.error('You must own this comic NFT to read it. Purchase it from the marketplace!');
        navigate(`/comic/${id}`);
      } else if (error.response?.status === 401) {
        toast.error('Please login to read comics');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load comic');
        navigate('/marketplace');
      }
    } finally {
      setLoading(false);
    }
  };

  const nextPage = () => {
    if (currentPage < (comic?.pages?.length || 0) - 1) {
      setCurrentPage(prev => prev + 1);
      saveProgress(currentPage + 2); // Save next page (1-indexed)
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      saveProgress(currentPage); // Save previous page (1-indexed)
    }
  };

  // Auto-save reading progress
  const saveProgress = async (page) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/reader/comics/${id}/progress`, {
        currentPage: page
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Progress saved: Page ${page}`);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const goToPage = (index) => {
    setCurrentPage(index);
    saveProgress(index + 1); // 1-indexed
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Spinner size="lg" />
      </div>
    );
  }

  // Extract page URLs from content.pages array
  console.log('📚 Comic data structure:', {
    hasComic: !!comic,
    hasContent: !!comic?.content,
    hasPages: !!comic?.content?.pages,
    pagesLength: comic?.content?.pages?.length,
    pagesRaw: comic?.content?.pages,
    comicStatus: comic?.status
  });

  const pages = comic?.content?.pages?.map(page => {
    // Handle different page structures
    const url = page?.web || page?.original || page;
    console.log('🔍 Processing page:', { page, url });

    // If it's an IPFS hash, convert to gateway URL
    if (typeof url === 'string') {
      if (url.startsWith('Qm') || url.startsWith('bafy')) {
        return `https://gateway.pinata.cloud/ipfs/${url}`;
      }
      if (url.startsWith('ipfs://')) {
        return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      }
      return url;
    }
    console.warn('⚠️ Invalid page URL:', page);
    return null;
  }).filter(Boolean) || [];

  console.log('✅ Processed page URLs:', pages);

  return (
    <div className={`min-h-screen bg-black text-white ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-gray-900 border-b border-purple-500/30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/comic/${id}`}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{comic?.title}</h1>
            <p className="text-sm text-purple-400">
              <BookOpen className="w-4 h-4 inline mr-1" />
              by {comic?.creator?.username}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 px-3 py-1 bg-gray-800 rounded-lg">
            Page {currentPage + 1} of {pages.length}
          </span>
          <button
            onClick={() => setZoom(prev => Math.max(50, prev - 10))}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-400 px-2">{zoom}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(200, prev + 10))}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Reader */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] relative bg-gray-950">
        {/* Previous Button */}
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          className="absolute left-4 p-4 bg-purple-600 hover:bg-purple-700 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Comic Page with fade transition */}
        <div className="flex items-center justify-center p-8 overflow-auto">
          {pages.length > 0 ? (
            <div className="animate-fadeIn">
              <img
                key={currentPage} // Force remount for transition
                src={pages[currentPage]}
                alt={`Page ${currentPage + 1}`}
                className="max-h-[85vh] w-auto shadow-[0_0_60px_rgba(147,51,234,0.4)] rounded-lg border border-purple-500/30"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  imageRendering: 'high-quality'
                }}
                onError={(e) => {
                  console.error('Image failed to load:', pages[currentPage]);
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect width="400" height="600" fill="%23111"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23666" font-size="16"%3EImage not found%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No pages available</p>
            </div>
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={nextPage}
          disabled={currentPage === pages.length - 1}
          className="absolute right-4 p-4 bg-purple-600 hover:bg-purple-700 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Thumbnail Navigation */}
      <div className="bg-gray-900 border-t border-purple-500/30 p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {pages.map((page, index) => (
            <button
              key={index}
              onClick={() => goToPage(index)}
              className={`flex-shrink-0 relative ${
                currentPage === index
                  ? 'ring-2 ring-purple-500 shadow-lg scale-110'
                  : 'opacity-50 hover:opacity-100 hover:scale-105'
              } transition-all duration-200 rounded`}
            >
              <img
                src={page}
                alt={`Thumbnail ${index + 1}`}
                className="h-24 w-auto rounded shadow-md"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-1">
                {index + 1}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}