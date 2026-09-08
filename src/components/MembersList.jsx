import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/api';
import { Users, UserPlus, Trash2, CalendarClock, CheckCircle2 } from 'lucide-react';
import { formatNaira } from '../utils/formatters';

// Admin: lists the members of their own group (and admins/superadmin see relevant users).
export default function MembersList({ onOpenRegisterModal, groups }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawDateInput, setWithdrawDateInput] = useState({}); // userId -> date string

  // The admin's own group (for context)
  const myGroup = (groups || []).find(g => g.id === user?.groupId) || (groups || [])[0];

  // Keeping fee = 1 contribution amount per member (collected at end of circle).
  // The group's contribution amount is the reference for the fee.
  const groupContribution = Number(myGroup?.contributionAmount) || 0;

  useEffect(() => {
    let mounted = true;
    load();
    return () => { mounted = false; };

    async function load() {
      try {
        const r = await authFetch('/api/auth/users');
        const data = await r.json();
        if (mounted) {
          setUsers(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    }
  }, []);

  const isAdminUser = user?.role === 'admin' || user?.role === 'superadmin';

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this user account?')) return;
    try {
      await authFetch(`/api/auth/users/${id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      alert('Failed to remove user');
    }
  };

  const setWithdrawDate = async (id) => {
    const date = withdrawDateInput[id];
    if (!date) { alert('Pick a withdrawal date first'); return; }
    try {
      const r = await authFetch(`/api/auth/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawDate: date, withdrawalStatus: 'none', withdrawalAmount: null })
      });
      const updated = await r.json();
      if (r.ok) {
        setUsers(prev => prev.map(u => u.id === id ? updated : u));
        setWithdrawDateInput(prev => ({ ...prev, [id]: '' }));
      } else {
        alert(updated.message || 'Failed to set date');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const approveWithdrawal = async (id) => {
    if (!window.confirm('Approve and release this member\'s withdrawal?')) return;
    try {
      const r = await authFetch(`/api/auth/users/${id}/approve-withdrawal`, { method: 'PUT' });
      const updated = await r.json();
      if (r.ok) {
        setUsers(prev => prev.map(u => u.id === id ? updated : u));
      } else {
        alert(updated.message || 'Failed to approve');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const roleLabel = (r) => r === 'superadmin' ? 'Super Admin' : r === 'admin' ? 'Group Admin' : r === 'member' ? 'Member' : r === 'individual' ? 'Borrower' : r === 'cooperative' ? 'Cooperative' : r;

  const roleBadge = (r) => {
    if (r === 'superadmin') return 'badge-warning';
    if (r === 'admin') return 'badge-success';
    if (r === 'individual' || r === 'cooperative') return 'badge-danger';
    return 'badge-neutral';
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users className="w-6 h-6 text-emerald-400" /> Members
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {user?.role === 'superadmin' ? 'All registered users across every group.' : `Users in your group.`}
          </p>
          {groupContribution > 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--accent-gold)', marginTop: '0.25rem' }}>
              Keeping fee: <strong>1 contribution per member ({formatNaira(groupContribution)})</strong>, collected at the end of the circle — regardless of daily/weekly/monthly frequency.
            </p>
          )}
        </div>
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <button onClick={onOpenRegisterModal} className="btn btn-gold btn-sm">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading members...</p>
      ) : (
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Bank Details</th>
                <th>Contribution</th>
                <th>Withdrawal</th>
                {isAdminUser && <th>Admin Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${roleBadge(u.role)}`}>{roleLabel(u.role)}</span></td>
                  <td>
                    {u.bankName || u.accountNumber ? (
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{u.bankName || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.accountNumber || '—'}</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Not set</span>}
                  </td>
                  <td>
                    {u.contributionAmount ? (
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{formatNaira(u.contributionAmount)}</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                  </td>
                  <td>
                    {u.role === 'member' ? (
                      <div>
                        {u.withdrawDate && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date: {u.withdrawDate}</div>}
                        {u.contributionAmount ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Fee: <strong style={{ color: '#f59e0b' }}>{formatNaira(Number(u.contributionAmount))}</strong> (1 contribution)
                          </div>
                        ) : null}
                        {u.withdrawalStatus === 'requested' && (
                          <span className="badge badge-warning">Requested</span>
                        )}
                        {u.withdrawalStatus === 'paid' && (
                          <span className="badge badge-success">Paid ✓</span>
                        )}
                        {u.withdrawalStatus === 'none' && (
                          <span className="badge badge-neutral">—</span>
                        )}
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                  </td>
                  {isAdminUser && (
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                        {u.role === 'member' && (
                          <>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                              <input
                                type="date"
                                value={withdrawDateInput[u.id] || ''}
                                onChange={(e) => setWithdrawDateInput(prev => ({ ...prev, [u.id]: e.target.value }))}
                                style={{ fontSize: '0.75rem', padding: '0.25rem', borderRadius: '6px', border: '1px solid var(--border-card)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
                              />
                              <button
                                onClick={() => setWithdrawDate(u.id)}
                                title="Set withdrawal date"
                                style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', display: 'inline-flex' }}
                              >
                                <CalendarClock className="w-4 h-4" />
                              </button>
                            </div>
                            {u.withdrawalStatus === 'requested' && (
                              <button onClick={() => approveWithdrawal(u.id)} className="btn btn-success btn-sm" style={{ fontSize: '0.75rem' }}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Release
                              </button>
                            )}
                          </>
                        )}
                        {u.id !== user?.id && (
                          <button onClick={() => handleDelete(u.id)} title="Remove user" style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'inline-flex' }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
