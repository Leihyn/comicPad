import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken
        });

        const { token } = response.data.data;
        localStorage.setItem('token', token);

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Show error toast
    const message = error.response?.data?.message || 'An error occurred';
    toast.error(message);

    return Promise.reject(error);
  }
);

export default api;
// ========== AUTH API ==========

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  connectWallet: (walletData) => api.post('/auth/connect-wallet', walletData),
  disconnectWallet: () => api.post('/auth/disconnect-wallet'),
  requestCreatorStatus: (data) => api.post('/auth/request-creator', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
};

// ========== COMICS API ==========

export const comicsAPI = {
  getComics: (params = {}) => api.get('/comics', { params }),
  getComicById: (id) => api.get(`/comics/${id}`),
  createComic: (formData) => api.post('/comics', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateComic: (id, data) => api.put(`/comics/${id}`, data),
  deleteComic: (id) => api.delete(`/comics/${id}`),
  mintComic: (id, quantity) => api.post(`/comics/${id}/mint`, { quantity }),
  getCreatorComics: () => api.get('/comics/creator/my-comics'),
  getUserComics: () => api.get('/comics/user/collection'),
  favoriteComic: (id) => api.post(`/comics/${id}/favorite`),
  unfavoriteComic: (id) => api.delete(`/comics/${id}/favorite`),
};

// ========== COLLECTIONS API ==========

export const collectionsAPI = {
  getCollections: (params = {}) => api.get('/comics/collections', { params }),
  getCollectionById: (id) => api.get(`/comics/collections/${id}`),
  createCollection: (formData) => api.post('/comics/collections', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateCollection: (id, data) => api.put(`/comics/collections/${id}`, data),
  deleteCollection: (id) => api.delete(`/comics/collections/${id}`),
};

// ========== MARKETPLACE API ==========

export const marketplaceAPI = {
  getListings: (params = {}) => api.get('/marketplace/listings', { params }),
  getListingById: (id) => api.get(`/marketplace/listings/${id}`),
  createListing: (data) => api.post('/marketplace/listings', data),
  buyNFT: (id, data) => api.post(`/marketplace/listings/${id}/buy`, data),
  placeBid: (id, data) => api.post(`/marketplace/listings/${id}/bid`, data),
  completeAuction: (id) => api.post(`/marketplace/listings/${id}/complete`),
  cancelListing: (id) => api.delete(`/marketplace/listings/${id}`),
  makeOffer: (data) => api.post('/marketplace/offers', data),
  respondToOffer: (id, data) => api.put(`/marketplace/offers/${id}`, data),
};

// ========== STATS API ==========

export const statsAPI = {
  getPlatformStats: () => api.get('/stats/platform'),
  getTrendingComics: (limit = 10) => api.get('/stats/trending', { params: { limit } }),
};

// ========== SEARCH API ==========

export const searchAPI = {
  searchComics: (query, params = {}) => api.get('/search', { params: { q: query, ...params } }),
};

// ========== USER API ==========

export const userAPI = {
  getUserById: (id) => api.get(`/users/${id}`),
  getUserProfile: (username) => api.get(`/users/profile/${username}`),
  followUser: (id) => api.post(`/users/${id}/follow`),
  unfollowUser: (id) => api.delete(`/users/${id}/follow`),
};
