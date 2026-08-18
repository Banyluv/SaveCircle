// Formatter utilities for Nigerian Naira (₦), Calabar locations, and dates

export const formatNaira = (amount) => {
  if (amount === undefined || amount === null) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export const getDaysRemaining = (targetDateStr) => {
  if (!targetDateStr) return 0;
  const target = new Date(targetDateStr);
  const today = new Date();
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'verified':
    case 'paid':
    case 'disbursed':
      return 'badge-success';
    case 'pending':
    case 'awaiting verification':
      return 'badge-warning';
    case 'overdue':
    case 'late':
      return 'badge-danger';
    default:
      return 'badge-neutral';
  }
};

export const getTrustScoreColor = (score) => {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 75) return 'text-amber-400';
  return 'text-rose-400';
};
