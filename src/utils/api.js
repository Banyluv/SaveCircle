// Centralised API base URL for the frontend.
// - Desktop (Electron): uses the embedded API server port exposed via preload.
// - Mobile (Capacitor APK): there is no bundled server, so the configured
//   production URL is used. Capacitor serves the app from https://localhost, so
//   a relative "/api/..." would hit the phone itself and fail.
// - Online/hosted mode: the backend serves the built frontend, so we use the
//   SAME origin (relative paths). The Vite dev proxy also forwards /api → 5000.
// - Otherwise: use VITE_API_URL if set.
const desktopUrl = window.savecircleDesktop?.isDesktop && window.savecircleDesktop.apiBaseUrl
  ? window.savecircleDesktop.apiBaseUrl
  : null;

// Capacitor injects a global `Capacitor` object; `isNativePlatform()` is true
// only inside the packaged Android/iOS app (and false in a normal browser).
const isNativeApp = typeof window !== 'undefined'
  && (window.Capacitor?.isNativePlatform?.() === true
      || window.location.protocol === 'capacitor:');

// Injected at build time by Vite (see .env / vite.config.js). Empty in the
// browser build, where same-origin requests are correct.
const configuredUrl = (import.meta.env?.VITE_API_URL || '').replace(/\/+$/, '');

// A server URL saved on the device overrides the build-time one. This lets a
// single APK be re-pointed (e.g. from a LAN address during testing to the
// hosted URL later) without rebuilding and reinstalling it.
const RUNTIME_URL_KEY = 'savecircle_api_url';

export const getRuntimeApiUrl = () => {
  try { return (localStorage.getItem(RUNTIME_URL_KEY) || '').replace(/\/+$/, ''); } catch { return ''; }
};

export const setRuntimeApiUrl = (url) => {
  try {
    const clean = String(url || '').trim().replace(/\/+$/, '');
    if (clean) localStorage.setItem(RUNTIME_URL_KEY, clean);
    else localStorage.removeItem(RUNTIME_URL_KEY);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
};

export const API_BASE_URL = desktopUrl
  || getRuntimeApiUrl()
  || (isNativeApp ? configuredUrl : '');

// True when this is a native build with no server address available at all:
// nothing was compiled in and the user has not set one on the device. The UI
// uses this to explain the problem instead of showing a bare network error.
export const API_MISCONFIGURED = isNativeApp && !desktopUrl && !API_BASE_URL;

// Native builds can always be re-pointed, so the UI offers a server field.
export const CAN_SET_SERVER_URL = isNativeApp && !desktopUrl;

export const apiFetch = (path, options = {}) => {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  return fetch(url, options);
};

// Global 401 handler.
// When the API rejects our token (expired/corrupt, or the user no longer
// exists — e.g. after switching databases), we must drop the stale session and
// return to the login screen. Without this the app stays "logged in" but every
// request fails with "Not authorized, token failed" and the user is stuck.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

const handleStatus = (res) => {
  if (res.status === 401 && onUnauthorized) {
    try { onUnauthorized(); } catch (e) { /* ignore */ }
  }
  return res;
};

// Fetch with the stored auth token attached (for protected endpoints).
export const authFetch = async (path, options = {}) => {
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
  const res = await fetch(url, { ...options, headers });
  return handleStatus(res);
};

// ─── Loans API helpers ───────────────────────────────────────────────────────
// Convenience wrapper that parses JSON and throws on non-OK responses.
export const loanFetch = async (path, options = {}) => {
  const res = await authFetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const loanAPI = {
  calculate: (payload) => loanFetch('/api/loans/calculate', { method: 'POST', body: JSON.stringify(payload) }),
  products: () => loanFetch('/api/loans/products'),
  createProduct: (payload) => loanFetch('/api/loans/products', { method: 'POST', body: JSON.stringify(payload) }),
  mine: () => loanFetch('/api/loans/mine'),
  apply: (payload) => loanFetch('/api/loans/apply', { method: 'POST', body: JSON.stringify(payload) }),
  detail: (id) => loanFetch(`/api/loans/${id}`),
  dashboard: () => loanFetch('/api/loans/dashboard'),
  adminAll: () => loanFetch('/api/loans/admin'),
  adminStats: () => loanFetch('/api/loans/admin/stats'),
  review: (id, payload) => loanFetch(`/api/loans/admin/${id}/review`, { method: 'PATCH', body: JSON.stringify(payload) }),
  submitRepayment: (id, payload) => loanFetch(`/api/loans/${id}/repay`, { method: 'POST', body: JSON.stringify(payload) }),
  verifyRepayment: (rid) => loanFetch(`/api/loans/repayments/${rid}/verify`, { method: 'PUT' }),
  // Registered loan borrowers (admin)
  borrowers: () => loanFetch('/api/loans/borrowers'),
  registerBorrower: (payload) => loanFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  applyOnBehalf: (payload) => loanFetch('/api/loans/apply', { method: 'POST', body: JSON.stringify(payload) })
};

// ─── Notifications API helpers ───────────────────────────────────────────────
export const notificationAPI = {
  getAll: () => loanFetch('/api/notifications'),
  unreadCount: () => loanFetch('/api/notifications/unread-count'),
  markAllRead: () => loanFetch('/api/notifications/read-all', { method: 'PATCH' }),
  markOneRead: (id) => loanFetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
};

// ─── Platform settings (central account) ─────────────────────────────────────
// Every signed-in user can read where to pay; only a superadmin can change it.
export const settingsAPI = {
  getCentralAccount: () => loanFetch('/api/settings/central-account'),
  updateCentralAccount: (payload) =>
    loanFetch('/api/settings/central-account', { method: 'PUT', body: JSON.stringify(payload) })
};

// ─── App release / over-the-air update ───────────────────────────────────────
// Uses plain fetch (NOT loanFetch): the caller may not be signed in yet — an
// out-of-date app must still be able to check for and install an update.
export const appAPI = {
  latestVersion: async (currentVersionCode) => {
    const qs = currentVersionCode === undefined || currentVersionCode === null
      ? ''
      : `?currentVersionCode=${encodeURIComponent(currentVersionCode)}`;
    const res = await apiFetch(`/api/app/version${qs}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Update check failed (${res.status})`);
    return data;
  }
};
