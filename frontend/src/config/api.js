// API Configuration
// Uses environment variable in production, falls back to localhost in development

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const config = {
  apiUrl: API_BASE_URL,
  timeout: 30000, // 30 seconds
};

export default API_BASE_URL;
