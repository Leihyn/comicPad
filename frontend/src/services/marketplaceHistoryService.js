// frontend/src/services/marketplaceHistoryService.js
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';

const marketplaceHistoryService = {
  /**
   * Get user's marketplace transaction history
   */
  async getHistory(params = {}) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/marketplace/history`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching marketplace history:', error);
      throw error;
    }
  },

  /**
   * Get specific transaction by ID
   */
  async getTransaction(transactionId) {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/marketplace/history/${transactionId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  },

  /**
   * Get marketplace transaction statistics
   */
  async getTransactionStats(timeRange = 30) {
    try {
      const response = await axios.get(`${API_BASE}/marketplace/stats/transactions`, {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      throw error;
    }
  }
};

export default marketplaceHistoryService;
