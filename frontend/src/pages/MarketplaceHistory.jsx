// frontend/src/pages/MarketplaceHistory.jsx
import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, TrendingUp, DollarSign, Package, ExternalLink, Filter } from 'lucide-react';
import marketplaceHistoryService from '../services/marketplaceHistoryService';
import toast from 'react-hot-toast';

export default function MarketplaceHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, failed, pending
  const [typeFilter, setTypeFilter] = useState('all'); // all, purchase, listing
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    skip: 0,
    hasMore: false
  });

  useEffect(() => {
    // Reset pagination when filters change
    setPagination(prev => ({ ...prev, skip: 0 }));
  }, [filter, typeFilter]);

  useEffect(() => {
    loadHistory();
  }, [filter, typeFilter, pagination.skip]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pagination.limit,
        skip: pagination.skip
      };

      if (filter !== 'all') params.status = filter;
      if (typeFilter !== 'all') params.type = typeFilter;

      console.log('📊 Loading history with params:', params);

      const response = await marketplaceHistoryService.getHistory(params);

      console.log('📊 Received transactions:', {
        count: response.data.transactions?.length || 0,
        pagination: response.data.pagination,
        filters: { status: filter, type: typeFilter }
      });

      setTransactions(response.data.transactions);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/50',
      failed: 'bg-red-500/20 text-red-400 border-red-500/50',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'purchase':
        return <TrendingUp className="w-4 h-4" />;
      case 'listing':
        return <Package className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (tx) => {
    if (!tx.completedAt && !tx.failedAt) return 'In progress...';
    const end = tx.completedAt || tx.failedAt;
    const duration = new Date(end) - new Date(tx.initiatedAt);
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Marketplace History</h1>
          <p className="text-gray-400">Track all your marketplace transactions</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400 font-medium">Status:</span>
            <div className="flex gap-2">
              {['all', 'completed', 'failed', 'pending'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === status
                      ? 'bg-comic-purple text-white'
                      : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Type:</span>
            <div className="flex gap-2">
              {['all', 'purchase', 'listing'].map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    typeFilter === type
                      ? 'bg-comic-blue text-white'
                      : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-comic-purple border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 bg-dark-800/50 rounded-xl border border-dark-700">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx._id}
                className="bg-dark-800/80 backdrop-blur border border-dark-700 rounded-xl p-6 hover:border-comic-purple/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  {/* Left: Transaction Info */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Status Icon */}
                    <div className="mt-1">{getStatusIcon(tx.status)}</div>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2 text-white font-medium">
                          {getTypeIcon(tx.type)}
                          <span className="capitalize">{tx.type}</span>
                        </div>
                        {getStatusBadge(tx.status)}
                      </div>

                      {/* NFT Details */}
                      <div className="mb-3">
                        <div className="text-gray-300 font-medium">
                          {tx.nft?.comicId?.title || 'Unknown Comic'} - Episode #{tx.nft?.episodeId?.episodeNumber || '?'}
                        </div>
                        <div className="text-sm text-gray-400">
                          Serial #{tx.nft?.serialNumber} • Token: {tx.nft?.tokenId}
                        </div>
                      </div>

                      {/* Transaction Details Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Price:</span>
                          <span className="text-comic-cyan font-semibold ml-2">
                            {tx.price?.amount} {tx.price?.currency}
                          </span>
                        </div>
                        {tx.fees && (
                          <div>
                            <span className="text-gray-500">Fees:</span>
                            <span className="text-gray-300 ml-2">
                              {tx.fees.totalFees?.toFixed(4)} HBAR
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Time:</span>
                          <span className="text-gray-300 ml-2">{formatDate(tx.initiatedAt)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="text-gray-300 ml-2">{formatDuration(tx)}</span>
                        </div>
                      </div>

                      {/* Participants */}
                      <div className="mt-3 pt-3 border-t border-dark-700">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Seller:</span>
                            <span className="text-gray-300 ml-2 font-mono text-xs">
                              {tx.seller?.accountId || 'Unknown'}
                            </span>
                          </div>
                          {tx.buyer?.accountId && (
                            <div>
                              <span className="text-gray-500">Buyer:</span>
                              <span className="text-gray-300 ml-2 font-mono text-xs">
                                {tx.buyer.accountId}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Error Message */}
                      {tx.status === 'failed' && tx.error && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <div className="text-red-400 font-medium text-sm mb-1">
                            Error: {tx.error.code}
                          </div>
                          <div className="text-red-300/70 text-xs">{tx.error.message}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Transaction Link */}
                  {tx.hederaTransaction?.transactionId && (
                    <div>
                      <a
                        href={tx.hederaTransaction.explorerUrl || `https://hashscan.io/testnet/transaction/${tx.hederaTransaction.transactionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-comic-purple/20 hover:bg-comic-purple/30 border border-comic-purple/50 rounded-lg text-comic-purple font-medium transition-all"
                      >
                        <span className="text-sm">View on HashScan</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <div className="mt-2 text-xs text-gray-500 font-mono text-right">
                        {tx.hederaTransaction.transactionId.substring(0, 20)}...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, skip: prev.skip + prev.limit }))}
              className="px-6 py-3 bg-comic-purple hover:bg-comic-purple/80 text-white font-semibold rounded-lg transition-all"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
