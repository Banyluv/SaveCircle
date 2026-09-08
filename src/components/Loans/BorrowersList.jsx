import React, { useState, useEffect } from 'react';
import { RefreshCw, User, Building2, UserPlus, Users } from 'lucide-react';
import { loanAPI } from '../../utils/api';
import { formatNaira, formatDate } from '../../utils/formatters';
import AddBorrowerModal from './AddBorrowerModal';

// Admin: registered loan-only borrowers (individuals + cooperatives).
// Lets the admin manage them and apply for a loan on their behalf.
export default function BorrowersList() {
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    loanAPI.borrowers()
      .then((d) => setBorrowers(Array.isArray(d.data) ? d.data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users className="w-6 h-6 text-emerald-400" /> Loan Borrowers
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Individuals and cooperatives registered for loan services only (no thrift group required).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw className="w-4 h-4" /> Refresh</button>
          <button className="btn btn-gold btn-sm" onClick={() => setShowAdd(true)}><UserPlus className="w-4 h-4" /> Add Borrower</button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem' }}>{error}</div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading borrowers…</p>
      ) : borrowers.length === 0 ? (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <Building2 className="w-10 h-10" style={{ margin: '0 auto 0.75rem', color: 'var(--primary-light)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No borrowers registered yet.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowAdd(true)}>Add your first borrower</button>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th><th>Name</th><th>Contact</th><th>Bank</th><th>Active Loans</th><th>Pending</th><th>Outstanding</th><th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {borrowers.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.role === 'cooperative'
                      ? <span className="badge badge-warning"><Building2 className="w-3 h-3" /> Cooperative</span>
                      : <span className="badge badge-success"><User className="w-3 h-3" /> Individual</span>}
                  </td>
                  <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{b.name}</td>
                  <td>
                    <div style={{ fontSize: '0.8rem' }}>{b.email}</div>
                    {b.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.phone}</div>}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {b.bankName ? <div style={{ color: 'var(--text-main)' }}>{b.bankName}</div> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    {b.accountNumber && <div style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{b.accountNumber}</div>}
                  </td>
                  <td>{b.active_loans || 0}</td>
                  <td>{b.pending_loans || 0}</td>
                  <td style={{ fontWeight: 600 }}>{formatNaira(b.outstanding || 0)}</td>
                  <td>{formatDate(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddBorrowerModal onClose={() => setShowAdd(false)} onAdded={load} />
      )}
    </div>
  );
}
