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
