// Centralised API base URL for the frontend.
// - Desktop (Electron): uses the embedded API server port exposed via preload.
// - Online/hosted mode: the backend serves the built frontend, so we use the
//   SAME origin (relative paths). The Vite dev proxy also forwards /api → 5000.
// - Otherwise: use VITE_API_URL if set.
const desktopUrl = window.savecircleDesktop?.isDesktop && window.savecircleDesktop.apiBaseUrl
  ? window.savecircleDesktop.apiBaseUrl
  : null;

// In desktop mode we must call the embedded server explicitly. In the browser
// (dev or hosted), relative paths work because of the Vite proxy / same-origin backend.
export const API_BASE_URL = desktopUrl || '';

export const apiFetch = (path, options = {}) => {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  return fetch(url, options);
};

// Fetch with the stored auth token attached (for protected endpoints).
export const authFetch = (path, options = {}) => {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = { ...(options.headers || {}) };
  try {
    const saved = localStorage.getItem('savecircle_user');
    if (saved) {
      const user = JSON.parse(saved);
      if (user?.token) headers.Authorization = `Bearer ${user.token}`;
    }
  } catch (e) {
    // ignore
  }
  return fetch(url, { ...options, headers });
};
