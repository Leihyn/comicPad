import api from './api';

export const readerService = {
  getComicContent: (comicId) => api.get(`/reader/comic/${comicId}`),
  
  saveProgress: (progressData) => api.post('/reader/progress', progressData),
  
  toggleBookmark: (bookmarkData) => api.post('/reader/bookmark', bookmarkData),
  
  getProgress: (comicId) => api.get(`/reader/progress/${comicId}`),
  
  downloadComic: (comicId) => api.get(`/reader/download/${comicId}`)
};