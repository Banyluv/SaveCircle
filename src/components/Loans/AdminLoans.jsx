import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Landmark, ListChecks, Wallet, UserPlus, Users, FileText, HandCoins } from 'lucide-react';
import { loanAPI } from '../../utils/api';
import { formatNaira, formatDate } from '../../utils/formatters';
import { loanBadge, LOAN_TYPE_LABELS } from './loanMeta';
import LoanDetailModal from './LoanDetailModal';
import BorrowersList from './BorrowersList';
import AddBorrowerModal from './AddBorrowerModal';
import ApplyLoanModal from './ApplyLoanModal';

const STATUS_FILTERS = ['', 'pending', 'under_review', 'disbursed', 'active', 'completed', 'rejected'];

export default function AdminLoans() {
  const [view, setView] = useState('applications'); // 'applications' | 'borrowers'
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showApply, setShowApply] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([loanAPI.adminAll(), loanAPI.adminStats()])
      .then(([a, s]) => {
        setApps(a.data.applications || []);
        setStats(s.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = statusFilter ? apps.filter((a) => a.status === statusFilter) : apps;

  const review = async (id, action) => {
    let reason = null;
    if (action === 'reject') {
      reason = window.prompt('Rejection reason:') || 'Declined';
      if (reason === null) return;
    }
    const verb = action === 'approve' ? 'Approve & disburse this loan? This will create its repayment schedule.' : 'Reject this loan?';
    if (!window.confirm(verb)) return;
    setError('');
    try {
      await loanAPI.review(id, { action, rejection_reason: reason });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const statsCards = stats?.overview;

  return (
    <div>
      <div className="calabar-banner">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>Loan Portfolio Management</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Review applications, approve & disburse loans, verify repayments, and register borrowers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</button>
          <button className="btn btn-outline" onClick={() => setShowApply(true)}>
            <HandCoins className="w-4 h-4" /> Apply for my own loan
          </button>
          <button className="btn btn-gold" onClick={() => setShowAdd(true)}>
            <UserPlus className="w-4 h-4" /> Add Borrower
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem' }}>{error}</div>
      )}

      {/* Sub-tabs */}
      <div className="tab-list" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab-item ${view === 'applications' ? 'active' : ''}`} onClick={() => setView('applications')}>
          <FileText className="w-4 h-4" /> Applications
        </button>
        <button className={`tab-item ${view === 'borrowers' ? 'active' : ''}`} onClick={() => setView('borrowers')}>
          <Users className="w-4 h-4" /> Borrowers
        </button>
      </div>

      {view === 'borrowers' ? (
        <BorrowersList />
      ) : (
        <>
          {statsCards && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Active Loans', value: statsCards.active_loans, icon: <Wallet className="w-5 h-5" />, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
            { label: 'Pending Applications', value: statsCards.pending_applications, icon: <ListChecks className="w-5 h-5" />, color: 'var(--accent-gold)', bg: 'rgba(245,158,11,0.15)' },
            { label: 'Total Outstanding', value: formatNaira(statsCards.total_outstanding), icon: <Landmark className="w-5 h-5" />, color: 'var(--text-main)', bg: 'rgba(59,130,246,0.15)' },
            { label: 'Total Collected', value: formatNaira(statsCards.total_collected), icon: <Wallet className="w-5 h-5" />, color: 'var(--primary-light)', bg: 'rgba(0,135,81,0.15)' }
          ].map((c, i) => (
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

      {/* Pending repayments banner */}
      {stats?.pendingRepayments && stats.pendingRepayments.length > 0 && (
        <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-gold)' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-gold)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ListChecks className="w-4 h-4" /> {stats.pendingRepayments.length} repayment(s) awaiting verification
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {stats.pendingRepayments.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', background: 'var(--bg-surface-hover)', borderRadius: 8, padding: '0.6rem 0.9rem' }}>
                <div style={{ fontSize: '0.88rem' }}>
                  <strong style={{ color: 'var(--text-main)' }}>{r.borrower_name}</strong>
                  <span style={{ color: 'var(--text-muted)' }}> • {r.application_number} • {formatNaira(r.amount)} via {r.channel} {r.reference ? `(${r.reference})` : ''}</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setSelectedId(r.loan_id)}>Review</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="tab-list" style={{ marginBottom: '1rem' }}>
        {STATUS_FILTERS.map((s) => (
          <button key={s || 'all'} className={`tab-item ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No loan applications match this filter.
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Application</th><th>Borrower</th><th>Amount</th><th>Type</th><th>Rate</th><th>Tenure</th><th>Date</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{a.application_number}</td>
                  <td>{a.borrower_name}</td>
                  <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatNaira(a.principal_amount)}</td>
                  <td>{LOAN_TYPE_LABELS[a.loan_type] || a.loan_type}</td>
                  <td>{a.interest_rate}%</td>
                  <td>{a.tenure_months}m</td>
                  <td>{formatDate(a.created_at)}</td>
                  <td>{loanBadge(a.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setSelectedId(a.id)}>View</button>
                      {['pending', 'under_review'].includes(a.status) && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => review(a.id, 'approve')} title="Approve & disburse"><CheckCircle2 className="w-4 h-4" /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => review(a.id, 'reject')} title="Reject"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

          {selectedId && (
            <LoanDetailModal loanId={selectedId} onClose={() => setSelectedId(null)} isAdmin onChanged={load} />
          )}
        </>
      )}

      {showAdd && (
        <AddBorrowerModal onClose={() => setShowAdd(false)} onAdded={() => { load(); setView('borrowers'); }} />
      )}

      {showApply && (
        <ApplyLoanModal onClose={() => setShowApply(false)} onApplied={load} />
      )}
    </div>
  );
}
