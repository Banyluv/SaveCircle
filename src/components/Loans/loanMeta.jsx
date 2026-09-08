// Shared labels & helpers for the Loans module (SaveCircle design system).

export const LOAN_TYPE_LABELS = {
  personal: 'Personal',
  business: 'Business',
  cooperative: 'Cooperative',
  emergency: 'Emergency',
  mortgage: 'Mortgage',
  auto: 'Auto',
};

export const INTEREST_TYPE_LABELS = {
  flat: 'Flat Rate',
  reducing: 'Reducing Balance',
  compound: 'Compound Interest',
};

export const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
  lump_sum: 'Lump Sum',
};

export const APPLICATION_STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  disbursed: 'Disbursed',
  active: 'Active',
  completed: 'Completed',
  defaulted: 'Defaulted',
  cancelled: 'Cancelled',
};

export const INSTALLMENT_STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
  waived: 'Waived',
  partial: 'Partial',
};

// Map a loan/application status to the existing SaveCircle badge classes.
export const loanBadgeClass = (status) => {
  const s = (status || '').toLowerCase();
  if (['paid', 'disbursed', 'active', 'completed', 'verified', 'approved'].includes(s)) return 'badge-success';
  if (['pending', 'under_review', 'partial', 'processing'].includes(s)) return 'badge-warning';
  if (['rejected', 'defaulted', 'overdue', 'cancelled', 'failed'].includes(s)) return 'badge-danger';
  return 'badge-neutral';
};

export const loanBadge = (status) => {
  const label = APPLICATION_STATUS_LABELS[status] || INSTALLMENT_STATUS_LABELS[status] || status;
  return <span className={`badge ${loanBadgeClass(status)}`}>{label}</span>;
};
