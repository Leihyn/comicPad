import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Maximize, Minimize, ZoomIn, ZoomOut,
  X, BookOpen, Menu, Home, List, Bookmark, Share2
} from 'lucide-react';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';

export default function EnhancedReader() {
  const { id } = useParams(); // Episode ID
  const navigate = useNavigate();
  const [episode, setEpisode] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'double'
  const [showThumbnails, setShowThumbnails] = useState(false);
  const pageRef = useRef(null);
  const uiTimeoutRef = useRef(null);

  useEffect(() => {
    loadEpisode();
  }, [id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') prevPage();
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === ' ') nextPage();
      if (e.key === 'Escape') {
        if (fullscreen) setFullscreen(false);
        else if (showThumbnails) setShowThumbnails(false);
        else navigate(-1);
      }
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 't' || e.key === 'T') setShowThumbnails(prev => !prev);
      if (e.key === 'h' || e.key === 'H') setShowUI(prev => !prev);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, episode, fullscreen, showThumbnails]);

  // Auto-hide UI in fullscreen
  useEffect(() => {
    if (fullscreen) {
      const resetTimer = () => {
        setShowUI(true);
        if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        uiTimeoutRef.current = setTimeout(() => setShowUI(false), 3000);
      };

      window.addEventListener('mousemove', resetTimer);
      resetTimer();

      return () => {
        window.removeEventListener('mousemove', resetTimer);
        if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
      };
    }
  }, [fullscreen]);

  const loadEpisode = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error('Please login to read comics');
        navigate('/login');
        return;
      }

      // Get episode data with access verification
      const response = await axios.get(`${API_BASE}/comics/episodes/${id}/read`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📖 Episode loaded:', response.data);
      const episodeData = response.data.data;

      if (!episodeData || !episodeData.hasAccess) {
        throw new Error('Access denied');
      }

      setEpisode(episodeData.episode);

      // Restore reading progress
      if (episodeData.progress && episodeData.progress.currentPage > 0) {
        setCurrentPage(episodeData.progress.currentPage - 1);
      }
    } catch (error) {
      console.error('Failed to load episode:', error);

      if (error.response?.status === 403) {
        toast.error('You need to own this comic to read it');
        navigate(`/marketplace`);
      } else if (error.response?.status === 401) {
        toast.error('Please login to read comics');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load comic');
        navigate(-1);
      }
    } finally {
      setLoading(false);
    }
  };

  const nextPage = () => {
    const pages = getPages();
    const increment = viewMode === 'double' ? 2 : 1;

    if (currentPage + increment < pages.length) {
      setCurrentPage(prev => prev + increment);
      saveProgress(currentPage + increment + 1);
    }
  };

  const prevPage = () => {
    const decrement = viewMode === 'double' ? 2 : 1;

    if (currentPage - decrement >= 0) {
      setCurrentPage(prev => prev - decrement);
      saveProgress(currentPage - decrement + 1);
    } else if (currentPage > 0) {
      setCurrentPage(0);
      saveProgress(1);
    }
  };

  const saveProgress = async (page) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/comics/episodes/${id}/progress`, {
        currentPage: page
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const goToPage = (index) => {
    setCurrentPage(index);
    saveProgress(index + 1);
    setShowThumbnails(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const getPages = () => {
    if (!episode?.content?.pages) return [];

    return episode.content.pages.map(page => {
      const url = page?.url || page?.original?.url || page;

      if (typeof url === 'string') {
        if (url.startsWith('Qm') || url.startsWith('bafy')) {
          return `https://gateway.pinata.cloud/ipfs/${url}`;
        }
        if (url.startsWith('ipfs://')) {
          return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
        }
        if (url.startsWith('http')) {
          return url;
        }
      }

      return url;
    }).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Spinner size="lg" />
      </div>
    );
  }

  const pages = getPages();
  const totalPages = pages.length;
  const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

  return (
    <div className={`min-h-screen bg-black text-white ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 ${
          showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold">{episode?.title || 'Reading Comic'}</h1>
                <p className="text-sm text-gray-400">
                  Episode {episode?.episodeNumber} • Page {currentPage + 1} of {totalPages}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                title="Show pages (T)"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'single' ? 'double' : 'single')}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                title="Toggle view mode"
              >
                <BookOpen className="w-5 h-5" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                title="Fullscreen (F)"
              >
                {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Reading Area */}
      <div
        className="flex items-center justify-center min-h-screen p-4 pt-24"
        onClick={() => setShowUI(!showUI)}
      >
        {pages.length > 0 ? (
          <div className="relative max-w-7xl w-full">
            <div className={`flex ${viewMode === 'double' ? 'gap-4' : ''} justify-center items-start`}>
              {/* Current Page */}
              <div
                ref={pageRef}
                className="relative group cursor-pointer"
                style={{
                  maxWidth: viewMode === 'double' ? '48%' : '100%',
                  transition: 'transform 0.3s ease-in-out'
                }}
              >
                <img
                  src={pages[currentPage]}
                  alt={`Page ${currentPage + 1}`}
                  className="w-full h-auto rounded-lg shadow-2xl"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'center',
                    imageRendering: 'high-quality'
                  }}
                />
              </div>

              {/* Second Page (Double page mode) */}
              {viewMode === 'double' && currentPage + 1 < totalPages && (
                <div
                  className="relative group cursor-pointer"
                  style={{ maxWidth: '48%' }}
                >
                  <img
                    src={pages[currentPage + 1]}
                    alt={`Page ${currentPage + 2}`}
                    className="w-full h-auto rounded-lg shadow-2xl"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: 'center'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Navigation Arrows */}
            <div
              className={`absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none transition-opacity duration-300 ${
                showUI ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); prevPage(); }}
                disabled={currentPage === 0}
                className={`pointer-events-auto p-4 m-4 bg-black/50 hover:bg-black/70 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextPage(); }}
                disabled={currentPage >= totalPages - (viewMode === 'double' ? 2 : 1)}
                className={`pointer-events-auto p-4 m-4 bg-black/50 hover:bg-black/70 rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No pages available</p>
          </div>
        )}
      </div>

      {/* Thumbnail Panel */}
      {showThumbnails && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">All Pages</h2>
              <button
                onClick={() => setShowThumbnails(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {pages.map((page, index) => (
                <div
                  key={index}
                  onClick={() => goToPage(index)}
                  className={`relative cursor-pointer group ${
                    index === currentPage ? 'ring-4 ring-purple-500' : ''
                  }`}
                >
                  <div className="aspect-[2/3] rounded overflow-hidden">
                    <img
                      src={page}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-xs text-center font-bold">{index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls Hint */}
      <div
        className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 px-6 py-3 rounded-full transition-opacity duration-300 ${
          showUI && !fullscreen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <p className="text-sm text-gray-400">
          ← → Arrow keys • <kbd className="px-2 py-1 bg-white/10 rounded">F</kbd> Fullscreen •
          <kbd className="px-2 py-1 bg-white/10 rounded ml-2">T</kbd> Thumbnails •
          <kbd className="px-2 py-1 bg-white/10 rounded ml-2">H</kbd> Hide UI
        </p>
      </div>
    </div>
  );
}
