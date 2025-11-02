import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { comicService } from '../services/comicService';
import { useWallet } from '../contexts/useWallet';
import { toast } from 'react-toastify';
import './ComicReader.css';

const ComicReader = () => {
  const { comicId } = useParams();
  const navigate = useNavigate();
  const { isConnected, accountId } = useWallet();
  
  const [comic, setComic] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('single'); // single, double, continuous
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  
  const readerRef = useRef(null);

  useEffect(() => {
    loadComic();
  }, [comicId]);

  const loadComic = async () => {
    try {
      setLoading(true);
      
      // Verify ownership
      const ownershipCheck = await comicService.verifyOwnership(comicId);
      if (!ownershipCheck.hasAccess) {
        toast.error('You do not own this comic');
        navigate('/marketplace');
        return;
      }

      // Load comic data
      const data = await comicService.getComicContent(comicId);
      setComic(data);

      // Load saved progress
      const progress = await comicService.getReadingProgress(comicId);
      if (progress) {
        setCurrentPage(progress.currentPage);
        setBookmarks(progress.bookmarks);
      }
    } catch (error) {
      console.error('Failed to load comic:', error);
      toast.error('Failed to load comic');
    } finally {
      setLoading(false);
    }
  };

  const nextPage = () => {
    if (currentPage < comic.content.pages.length) {
      const newPage = currentPage + (viewMode === 'double' ? 2 : 1);
      setCurrentPage(Math.min(newPage, comic.content.pages.length));
      saveProgress(newPage);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - (viewMode === 'double' ? 2 : 1);
      setCurrentPage(Math.max(newPage, 1));
      saveProgress(newPage);
    }
  };

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, comic.content.pages.length)));
    saveProgress(page);
  };

  const saveProgress = async (page) => {
    try {
      await comicService.saveReadingProgress(comicId, {
        currentPage: page,
        totalPages: comic.content.pages.length
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const toggleBookmark = async () => {
    try {
      const isBookmarked = bookmarks.some(b => b.pageNumber === currentPage);
      
      if (isBookmarked) {
        setBookmarks(bookmarks.filter(b => b.pageNumber !== currentPage));
      } else {
        const newBookmark = {
          pageNumber: currentPage,
          createdAt: new Date()
        };
        setBookmarks([...bookmarks, newBookmark]);
      }

      await comicService.toggleBookmark(comicId, currentPage);
      toast.success(isBookmarked ? 'Bookmark removed' : 'Page bookmarked');
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const toggleFullscreen = () => {
    if (!fullscreen) {
      readerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setFullscreen(!fullscreen);
  };

  const downloadComic = async () => {
    try {
      await comicService.downloadCBZ(comicId);
      toast.success('Download started');
    } catch (error) {
      console.error('Failed to download:', error);
      toast.error('Failed to download comic');
    }
  };

  if (loading) {
    return (
      <div className="reader-loading">
        <div className="spinner"></div>
        <p>Loading comic...</p>
      </div>
    );
  }

  if (!comic) {
    return <div>Comic not found</div>;
  }

  const isBookmarked = bookmarks.some(b => b.pageNumber === currentPage);

  return (
    <div ref={readerRef} className={`comic-reader ${fullscreen ? 'fullscreen' : ''}`}>
      {/* Top Controls */}
      <div className="reader-controls top">
        <button onClick={() => navigate(-1)} className="btn-back">
          ← Back
        </button>
        
        <div className="comic-info">
          <h2>{comic.title}</h2>
          <span>Page {currentPage} of {comic.content.pages.length}</span>
        </div>

        <div className="control-buttons">
          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'double' : 'single')}
            title="View Mode"
          >
            {viewMode === 'single' ? '📄' : '📖'}
          </button>
          
          <button onClick={toggleBookmark} title="Bookmark">
            {isBookmarked ? '⭐' : '☆'}
          </button>
          
          <button onClick={downloadComic} title="Download">
            ⬇️
          </button>
          
          <button onClick={toggleFullscreen} title="Fullscreen">
            ⛶
          </button>
        </div>
      </div>

      {/* Page Display */}
      <div className={`page-container ${viewMode}`} style={{ zoom: `${zoom}%` }}>
        {viewMode === 'single' ? (
          <img
            src={`https://gateway.pinata.cloud/ipfs/${comic.content.pages[currentPage - 1].web}`}
            alt={`Page ${currentPage}`}
            className="comic-page"
          />
        ) : (
          <>
            <img
              src={`https://gateway.pinata.cloud/ipfs/${comic.content.pages[currentPage - 1]?.web}`}
              alt={`Page ${currentPage}`}
              className="comic-page"
            />
            {currentPage < comic.content.pages.length && (
              <img
                src={`https://gateway.pinata.cloud/ipfs/${comic.content.pages[currentPage]?.web}`}
                alt={`Page ${currentPage + 1}`}
                className="comic-page"
              />
            )}
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="reader-controls bottom">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className="btn-nav"
        >
          ← Previous
        </button>

        <div className="page-slider">
          <input
            type="range"
            min="1"
            max={comic.content.pages.length}
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value))}
            className="slider"
          />
          <div className="bookmarks">
            {bookmarks.map((bookmark, idx) => (
              <div
                key={idx}
                className="bookmark-marker"
                style={{
                  left: `${(bookmark.pageNumber / comic.content.pages.length) * 100}%`
                }}
                onClick={() => goToPage(bookmark.pageNumber)}
              />
            ))}
          </div>
        </div>

        <button
          onClick={nextPage}
          disabled={currentPage >= comic.content.pages.length}
          className="btn-nav"
        >
          Next →
        </button>

        <div className="zoom-controls">
          <button onClick={() => setZoom(Math.max(50, zoom - 10))}>-</button>
          <span>{zoom}%</span>
          <button onClick={() => setZoom(Math.min(200, zoom + 10))}>+</button>
        </div>
      </div>
    </div>
  );
};

export default ComicReader;