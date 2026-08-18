// Centralised API base URL for the frontend.
// Uses Vite environment variable (VITE_API_URL) with a localhost fallback for dev.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiFetch = (path, options = {}) => {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  return fetch(url, options);
};
