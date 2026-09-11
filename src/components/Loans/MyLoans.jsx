import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, HandCoins, Wallet, Clock, TrendingUp } from 'lucide-react';
import { loanAPI } from '../../utils/api';
import { formatNaira, formatDate } from '../../utils/formatters';
import { loanBadge, LOAN_TYPE_LABELS } from './loanMeta';
import ApplyLoanModal from './ApplyLoanModal';
import LoanDetailModal from './LoanDetailModal';

// Status tabs. An application is created as 'pending' and becomes 'disbursed'
// when approved (there is no separate 'active' application status), so the
// filters must match the values actually stored or a tab shows nothing.
const STATUS_FILTERS = ['', 'pending', 'disbursed', 'completed', 'rejected'];

export default function MyLoans({ isAdmin }) {
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showApply, setShowApply] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([loanAPI.mine(), loanAPI.dashboard()])
      .then(([m, d]) => {
        setLoans(m.data.loans || []);
        setStats(d.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = statusFilter ? loans.filter((l) => l.status === statusFilter) : loans;

  const s = stats?.stats;
  const statsCards = s ? [
    { label: 'Active Loans', value: s.active_loans, icon: <Wallet className="w-5 h-5" />, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Pending Applications', value: s.pending_loans, icon: <Clock className="w-5 h-5" />, color: 'var(--accent-gold)', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Total Outstanding', value: formatNaira(s.total_outstanding), icon: <TrendingUp className="w-5 h-5" />, color: 'var(--text-main)', bg: 'rgba(59,130,246,0.15)' },
    { label: 'Total Repaid', value: formatNaira(s.total_paid), icon: <HandCoins className="w-5 h-5" />, color: 'var(--primary-light)', bg: 'rgba(0,135,81,0.15)' }
  ] : [];

  return (
    <div>
      <div className="calabar-banner">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>Loans</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Apply for a loan, track your applications, and manage repayments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</button>
          <button className="btn btn-gold" onClick={() => setShowApply(true)}><Plus className="w-4 h-4" /> Apply for Loan</button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem' }}>{error}</div>
      )}

      {statsCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {statsCards.map((c, i) => (
            <div key={i} className="glass-card" style={{ padding: '1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{c.label}</span>
                <span style={{ color: c.color, background: c.bg, padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}>{c.icon}</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming payments */}
      {stats?.upcoming_payments && stats.upcoming_payments.length > 0 && (
        <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-gold)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock className="w-4 h-4" /> Upcoming Payments
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {stats.upcoming_payments.map((p, i) => (
              <div key={i} style={{ background: 'var(--bg-surface-hover)', borderRadius: 8, padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--text-main)' }}>{formatNaira(p.total_installment)}</strong>
                <span style={{ color: 'var(--text-muted)' }}> due {formatDate(p.due_date)} • {p.application_number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tab-list" style={{ marginBottom: '1rem' }}>
        {STATUS_FILTERS.map((s2) => (
          <button key={s2 || 'all'} className={`tab-item ${statusFilter === s2 ? 'active' : ''}`} onClick={() => setStatusFilter(s2)}>
            {s2 === '' ? 'All' : s2.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <HandCoins className="w-10 h-10" style={{ margin: '0 auto 0.75rem', color: 'var(--primary-light)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No loans found.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowApply(true)}>
            <Plus className="w-4 h-4" /> Apply for your first loan
          </button>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Application</th><th>Amount</th><th>Type</th><th>Rate</th><th>Tenure</th><th>Date</th><th>Balance</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{l.application_number}</td>
                  <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatNaira(l.principal_amount)}</td>
                  <td>{LOAN_TYPE_LABELS[l.loan_type] || l.loan_type}</td>
                  <td>{l.interest_rate}% {l.interest_type}</td>
                  <td>{l.tenure_months}m</td>
                  <td>{formatDate(l.created_at)}</td>
                  <td>{l.outstanding_balance != null ? formatNaira(l.outstanding_balance) : '—'}</td>
                  <td>{loanBadge(l.status)}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => setSelectedId(l.id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showApply && (
        <ApplyLoanModal onClose={() => setShowApply(false)} onApplied={load} />
      )}
      {selectedId && (
        <LoanDetailModal loanId={selectedId} onClose={() => setSelectedId(null)} isAdmin={!!isAdmin} onChanged={load} />
      )}
    </div>
  );
}
