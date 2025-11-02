import api from './api';

const comicService = {
  getComics: async (params = {}) => {
    const response = await api.get('/comics', { params });
    return response.data.comics || []; // Return comics array
  },

  getComicById: async (id) => {
    const response = await api.get(`/comics/${id}`);
    return response.data.comic; // Interceptor returns response.data, so this is response.data.data.comic
  },

  createComic: async (formData) => {
    const response = await api.post('/comics', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response; // Interceptor already returns response.data
  },

  updateComic: async (id, data) => {
    const response = await api.put(`/comics/${id}`, data);
    return response; // Interceptor already returns response.data
  },

  deleteComic: async (id) => {
    const response = await api.delete(`/comics/${id}`);
    return response; // Interceptor already returns response.data
  },

  mintComic: async (id, quantity) => {
    const response = await api.post(`/comics/${id}/mint`, { quantity });
    return response; // Interceptor already returns response.data
  },

  getTrending: async () => {
    const response = await api.get('/stats/trending');
    return response; // Interceptor already returns response.data
  },

  searchComics: async (query, filters = {}) => {
    const response = await api.get('/search', {
      params: { q: query, type: 'comics', ...filters }
    });
    return response.data; // Return the data object which contains comics
  },

  addToFavorites: async (comicId) => {
    const response = await api.post(`/users/favorites/${comicId}`);
    return response; // Interceptor already returns response.data
  },

  removeFromFavorites: async (comicId) => {
    const response = await api.delete(`/users/favorites/${comicId}`);
    return response; // Interceptor already returns response.data
  }
};

export default comicService;