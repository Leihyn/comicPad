import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Image as ImageIcon, Info, DollarSign, Layers, Save, CheckCircle, AlertCircle, Zap, ExternalLink, X, Plus, MoveVertical } from 'lucide-react';
import toast from 'react-hot-toast';

// Make toast available globally for the Hedera service
if (typeof window !== 'undefined') {
  window.toast = toast;
}
import axios from 'axios';
import { WalletConnectContext } from '../contexts/WalletConnectContext';
import { openHashPackModal } from '../services/wallets/hashpackClient';
import { createNFTCollection, mintNFTs } from '../services/hederaService';

const API_BASE = 'http://localhost:3001/api/v1';

export default function CreateComic() {
  const navigate = useNavigate();
  const { isConnected, accountId } = useContext(WalletConnectContext);

  const [collections, setCollections] = useState([]);
  const [step, setStep] = useState(0); // 0: collection, 1: upload, 2: mint
  const [loading, setLoading] = useState(false);
  const [mintingStep, setMintingStep] = useState(null); // 'uploading', 'creating', 'minting', 'done'

  // Form state
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: '',
    symbol: '',
    description: '',
    royaltyPercentage: 10
  });

  const [comicData, setComicData] = useState({
    title: '',
    description: '',
    genre: 'superhero',
    issueNumber: '',
    series: '',
    price: '',
    supply: '1',
    edition: 'limited'
  });

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [pageFiles, setPageFiles] = useState([]);
  const [pagePreviews, setPagePreviews] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [createdComicId, setCreatedComicId] = useState(null);
  const [mintResult, setMintResult] = useState(null);
  const pageInputRef = useRef(null);

  // Load collections when wallet is connected and logged in
  useEffect(() => {
    if (isConnected && accountId && localStorage.getItem('token')) {
      fetchCollections();
    }
  }, [isConnected, accountId]);

  const fetchCollections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/comics/collections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollections(response.data.data.collections || []);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      // Create collection on Hedera using backend (no WalletConnect needed!)
      toast.loading('Creating collection on Hedera testnet...', { id: 'collection' });

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE}/comics/collections/create-on-hedera`, {
        name: newCollection.name,
        symbol: newCollection.symbol,
        description: newCollection.description,
        royaltyPercentage: newCollection.royaltyPercentage
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const { collection, hedera } = response.data.data;

      console.log('✅ Collection created:', collection);
      console.log('✅ Hedera result:', hedera);

      toast.success(`Collection created! Token ID: ${hedera.tokenId}`, { id: 'collection' });

      setSelectedCollection(response.data.data.collection);
      setShowNewCollection(false);
      fetchCollections();
      setStep(1);
    } catch (error) {
      console.error('Failed to create collection:', error);
      toast.error(error.message || 'Failed to create collection', { id: 'collection' });
    } finally {
      setLoading(false);
    }
  };

  // Handle cover image selection
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle adding pages (accumulative)
  const handleAddPages = (e) => {
    const files = [...e.target.files];

    if (pageFiles.length + files.length > 100) {
      toast.error(`Maximum 100 pages allowed. You can add ${100 - pageFiles.length} more.`);
      return;
    }

    // Add new files to existing array
    const newPageFiles = [...pageFiles, ...files];
    setPageFiles(newPageFiles);

    // Generate previews for new files
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPagePreviews((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same files can be selected again if needed
    e.target.value = null;
  };

  // Remove a page
  const handleRemovePage = (index) => {
    setPageFiles((prev) => prev.filter((_, i) => i !== index));
    setPagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...pageFiles];
    const newPreviews = [...pagePreviews];

    const draggedFile = newFiles[draggedIndex];
    const draggedPreview = newPreviews[draggedIndex];

    newFiles.splice(draggedIndex, 1);
    newPreviews.splice(draggedIndex, 1);

    newFiles.splice(index, 0, draggedFile);
    newPreviews.splice(index, 0, draggedPreview);

    setPageFiles(newFiles);
    setPagePreviews(newPreviews);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleUploadComic = async (e) => {
    e.preventDefault();

    if (!selectedCollection) {
      toast.error('Please select a collection');
      return;
    }

    if (!coverFile || pageFiles.length === 0) {
      toast.error('Please upload cover and at least one page');
      return;
    }

    setLoading(true);
    setMintingStep('uploading');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      // Append comic data
      formData.append('title', comicData.title);
      formData.append('description', comicData.description);
      formData.append('collectionId', selectedCollection._id);
      formData.append('genre', comicData.genre);
      formData.append('issueNumber', comicData.issueNumber);
      formData.append('series', comicData.series);
      formData.append('price', comicData.price);
      formData.append('supply', comicData.supply);
      formData.append('edition', comicData.edition);

      // Append files
      formData.append('cover', coverFile);
      pageFiles.forEach((file) => {
        formData.append('pages', file);
      });

      toast.loading('Uploading to IPFS...', { id: 'upload' });

      const response = await axios.post(`${API_BASE}/comics`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Uploaded to IPFS! ✅', { id: 'upload' });

      // Backend returns 'episode' not 'comic'
      const episodeId = response.data.data.episode?._id;
      if (!episodeId) {
        throw new Error('No episode ID in response');
      }

      setCreatedComicId(episodeId);
      setMintingStep('creating');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload comic', { id: 'upload' });
      setMintingStep(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMintNFT = async () => {
    if (!createdComicId || !selectedCollection) return;

    setLoading(true);
    setMintingStep('minting');

    try {
      const token = localStorage.getItem('token');
      const supply = parseInt(comicData.supply);

      // DEMO MODE: Use backend minting (reliable, instant, no wallet issues)
      toast.loading(`Minting ${supply} NFT(s)...`, { id: 'mint' });

      const response = await axios.post(
        `${API_BASE}/comics/episodes/${createdComicId}/mint-backend`,
        { quantity: supply },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Successfully minted ${supply} NFT(s)! 🎉`, { id: 'mint' });

      setMintResult(response.data.data);
      setMintingStep('done');
    } catch (error) {
      console.error('Mint error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to mint NFTs', { id: 'mint' });
      setMintingStep('creating');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-4">Wallet Not Connected</h1>
          <p className="text-gray-300 mb-6">Please connect your HashPack wallet to create comics</p>
          <button
            onClick={openHashPackModal}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-wider">
            Create Comic NFT
          </h1>
          <p className="text-purple-300">Mint your comic as an NFT on Hedera</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-500/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-300">Connected: {accountId.substring(0, 15)}...</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {['Collection', 'Upload', 'Mint'].map((label, idx) => (
              <div key={idx} className="flex items-center flex-1">
                <div className={`flex flex-col items-center ${idx !== 0 ? 'flex-1' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition ${
                    step >= idx ? 'bg-purple-500 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${step >= idx ? 'text-purple-300' : 'text-gray-500'}`}>
                    {label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`h-1 flex-1 mx-2 transition ${step > idx ? 'bg-purple-500' : 'bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-800/50 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl p-8 shadow-2xl">

          {/* Step 0: Select/Create Collection */}
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Select Collection</h2>

              {!showNewCollection ? (
                <>
                  {collections.length > 0 ? (
                    <div className="grid gap-4">
                      {collections.map((col) => (
                        <button
                          key={col._id}
                          onClick={() => {
                            setSelectedCollection(col);
                            setStep(1);
                          }}
                          className="p-4 bg-gray-700/50 hover:bg-gray-700 border-2 border-purple-500/30 hover:border-purple-500 rounded-lg text-left transition"
                        >
                          <div className="font-bold text-white">{col.name}</div>
                          <div className="text-sm text-gray-400">{col.symbol} · {col.royaltyPercentage}% royalty</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No collections yet. Create your first one!
                    </div>
                  )}

                  <button
                    onClick={() => setShowNewCollection(true)}
                    className="w-full py-3 bg-purple-500/20 border-2 border-purple-500 text-purple-300 rounded-lg hover:bg-purple-500/30 transition font-bold"
                  >
                    + Create New Collection
                  </button>
                </>
              ) : (
                <form onSubmit={handleCreateCollection} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Collection Name *</label>
                    <input
                      type="text"
                      value={newCollection.name}
                      onChange={(e) => setNewCollection({...newCollection, name: e.target.value})}
                      placeholder="e.g., Spider's Web Comics"
                      className="w-full px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Symbol * (2-10 chars)</label>
                    <input
                      type="text"
                      value={newCollection.symbol}
                      onChange={(e) => setNewCollection({...newCollection, symbol: e.target.value.toUpperCase()})}
                      placeholder="e.g., SWC"
                      className="w-full px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      required
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Royalty % (5-25%)</label>
                    <input
                      type="number"
                      value={newCollection.royaltyPercentage}
                      onChange={(e) => setNewCollection({...newCollection, royaltyPercentage: e.target.value})}
                      min="5"
                      max="25"
                      className="w-full px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowNewCollection(false)}
                      className="flex-1 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Collection'}
                    </button>
                  </div>

                  <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-200">
                    <Zap className="w-5 h-5 inline mr-2" />
                    Creating a collection requires gas (≈$0.10-$0.50 in HBAR)
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Step 1: Upload Comic */}
          {step === 1 && (
            <form onSubmit={handleUploadComic} className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Upload Comic</h2>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={comicData.title}
                  onChange={(e) => setComicData({...comicData, title: e.target.value})}
                  placeholder="e.g., The Amazing Issue #1"
                  className="w-full px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Price (HBAR) *</label>
                  <input
                    type="number"
                    value={comicData.price}
                    onChange={(e) => setComicData({...comicData, price: e.target.value})}
                    step="0.01"
                    min="0"
                    placeholder="50"
                    className="w-full px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Supply *</label>
                  <input
                    type="number"
                    value={comicData.supply}
                    onChange={(e) => setComicData({...comicData, supply: e.target.value})}
                    min="1"
                    max="10000"
                    placeholder="100"
                    className="w-full px-4 py-3 bg-gray-900/50 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Cover Image Section */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Cover Image *
                </label>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    {coverPreview ? (
                      <div className="relative group">
                        <img
                          src={coverPreview}
                          alt="Cover preview"
                          className="w-full aspect-[2/3] object-cover rounded-lg border-4 border-purple-500/50 shadow-xl"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCoverFile(null);
                            setCoverPreview(null);
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition">
                          <label className="cursor-pointer px-4 py-2 bg-purple-500 text-white rounded-lg font-medium">
                            Change
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleCoverChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full aspect-[2/3] border-4 border-dashed border-purple-500/50 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-900/20 transition">
                        <Upload className="w-12 h-12 text-purple-400 mb-2" />
                        <span className="text-sm text-purple-300 font-medium">Upload Cover</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverChange}
                          className="hidden"
                          required
                        />
                      </label>
                    )}
                  </div>
                  <div className="md:col-span-2 flex items-center text-sm text-gray-300">
                    <div className="space-y-2">
                      <p>📖 This is your comic book cover - make it eye-catching!</p>
                      <p className="text-xs text-gray-400">Recommended: 1200x1800px, JPG or PNG</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comic Pages Section - Comic Book Grid Style */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Comic Pages * (up to 100 pages)
                  </span>
                  <span className={`text-sm font-bold ${pageFiles.length >= 100 ? 'text-red-400' : 'text-purple-400'}`}>
                    {pageFiles.length} / 100
                  </span>
                </label>

                {/* Pages Grid */}
                <div className="bg-gray-900/50 border-2 border-purple-500/30 rounded-xl p-4 min-h-[200px]">
                  {pageFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="text-6xl mb-4">📚</div>
                      <p className="text-gray-400 mb-4">No pages added yet</p>
                      <label className="cursor-pointer px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add Pages
                        <input
                          ref={pageInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleAddPages}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-2">or drag & drop images here</p>
                    </div>
                  ) : (
                    <>
                      {/* Comic Book Grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-4">
                        {pagePreviews.map((preview, index) => (
                          <div
                            key={index}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`relative group cursor-move ${draggedIndex === index ? 'opacity-50' : ''}`}
                          >
                            {/* Page number badge */}
                            <div className="absolute -top-2 -left-2 z-10 w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-gray-900 shadow-lg">
                              {index + 1}
                            </div>

                            {/* Page thumbnail */}
                            <div className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-purple-500/30 group-hover:border-purple-500 transition shadow-lg">
                              <img
                                src={preview}
                                alt={`Page ${index + 1}`}
                                className="w-full h-full object-cover"
                              />

                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition">
                                <MoveVertical className="w-5 h-5 text-white" />
                              </div>

                              {/* Remove button */}
                              <button
                                type="button"
                                onClick={() => handleRemovePage(index)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-600 shadow-lg"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add More Button */}
                      {pageFiles.length < 100 && (
                        <label className="w-full py-3 bg-purple-500/20 border-2 border-dashed border-purple-500/50 rounded-lg cursor-pointer hover:bg-purple-500/30 hover:border-purple-500 transition flex items-center justify-center gap-2 text-purple-300 font-medium">
                          <Plus className="w-5 h-5" />
                          Add More Pages ({100 - pageFiles.length} remaining)
                          <input
                            ref={pageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAddPages}
                            className="hidden"
                          />
                        </label>
                      )}

                      {/* Instructions */}
                      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-xs text-blue-200">
                        <strong>💡 Tips:</strong> Drag pages to reorder • Click X to remove • Add more pages anytime
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload to IPFS'}
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Mint */}
          {step === 2 && (
            <div className="space-y-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Ready to Mint!</h2>

              {mintingStep === 'creating' && (
                <>
                  <div className="text-6xl mb-4">🚀</div>
                  <p className="text-gray-300 mb-6">Your comic is uploaded to IPFS. Click below to mint {comicData.supply} NFT(s) on Hedera.</p>

                  <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-200 text-left">
                    <Zap className="w-5 h-5 inline mr-2" />
                    <strong>Gas Required:</strong> Minting {comicData.supply} NFT(s) costs approximately ${(0.05 * parseInt(comicData.supply)).toFixed(2)}-${(0.15 * parseInt(comicData.supply)).toFixed(2)} in HBAR
                  </div>

                  <button
                    onClick={handleMintNFT}
                    disabled={loading}
                    className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-black text-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50"
                  >
                    {loading ? 'Minting...' : `Mint ${comicData.supply} NFT(s)`}
                  </button>
                </>
              )}

              {mintingStep === 'done' && mintResult && (
                <>
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-3xl font-bold text-green-400 mb-4">Successfully Minted!</h3>
                  <p className="text-gray-300 mb-4">Your comic NFTs have been minted on Hedera</p>

                  <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-6 text-left">
                    <p className="text-sm text-gray-300 mb-2"><strong>Serial Numbers:</strong> {mintResult.mintedNFTs?.join(', ') || 'N/A'}</p>
                    <p className="text-sm text-gray-300 mb-2"><strong>Transaction:</strong> {mintResult.transactionId || 'N/A'}</p>
                    {mintResult.explorerUrl && (
                      <a
                        href={mintResult.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
                      >
                        View on HashScan <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="flex gap-4 justify-center mt-6">
                    <Link
                      to="/profile"
                      className="px-8 py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600"
                    >
                      View Your Collection
                    </Link>
                    <Link
                      to="/marketplace"
                      className="px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                    >
                      Browse Marketplace
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
