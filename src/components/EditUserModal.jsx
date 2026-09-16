import React, { useEffect, useState } from 'react';
import { X, Save, UserCog, Landmark, CalendarClock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/api';
import { formatNaira } from '../utils/formatters';

// Shared "edit account" dialog. Used by Members, Admins and Loan Borrowers so
// there is ONE place that knows how to update a user (PUT /api/auth/users/:id).
//
// The backend already decides what each role may change; this form mirrors the
// same rules so a user never fills in a field that will be rejected:
//   - admins/superadmin: name, role, group, bank, contribution, withdraw date,
//     organisation/phone/address
//   - members/borrowers editing themselves: own profile + bank + contribution
const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Group Admin' },
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'individual', label: 'Borrower (Individual)' },
  { value: 'cooperative', label: 'Borrower (Cooperative)' }
];

export default function EditUserModal({ target, groups = [], onClose, onSaved }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuper = user?.role === 'superadmin';
  const isSelf = String(target?.id) === String(user?.id);

  // A non-admin may only ever edit their own account, and never its role.
  const canEditRole = isAdmin && !isSelf;
  const canEditWithdrawal = isAdmin;
  const canEditGroup = isSuper;

  const [form, setForm] = useState({
    name: '',
    role: 'member',
    groupId: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    contributionAmount: '',
    withdrawDate: '',
    orgName: '',
    phone: '',
    address: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!target) return;
    setForm({
      name: target.name || '',
      role: target.role || 'member',
      groupId: target.groupId || '',
      bankName: target.bankName || '',
      accountNumber: target.accountNumber || '',
      accountName: target.accountName || '',
      contributionAmount: target.contributionAmount != null ? String(target.contributionAmount) : '',
      withdrawDate: target.withdrawDate ? String(target.withdrawDate).slice(0, 10) : '',
      orgName: target.orgName || '',
      phone: target.phone || '',
      address: target.address || ''
    });
    setError('');
  }, [target]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!target?.id) return;

    setSaving(true);
    setError('');

    // Send only what this user is allowed to change: the API rejects unknown
    // keys for self-service edits, so over-posting would fail the whole save.
    const payload = {
      name: form.name,
      bankName: form.bankName || null,
      accountNumber: form.accountNumber || null,
      accountName: form.accountName || null,
      contributionAmount: form.contributionAmount === '' ? null : Number(form.contributionAmount),
      phone: form.phone || null,
      address: form.address || null,
      orgName: form.orgName || null
    };
    if (canEditRole) payload.role = form.role;
    if (canEditGroup) payload.groupId = form.groupId || null;
    if (canEditWithdrawal) payload.withdrawDate = form.withdrawDate || null;

    try {
      const res = await authFetch(`/api/auth/users/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || `Could not save changes (${res.status})`);
        return;
      }
      if (onSaved) onSaved(data);
      onClose();
    } catch (err) {
      setError('Network error — could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  if (!target) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCog className="w-5 h-5 text-emerald-400" /> Edit Account
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {target.name} &bull; {target.email}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '0.7rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
            <AlertTriangle className="w-4 h-4" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Identity */}
          <div className="form-group">
            <label>Full name / Organisation</label>
            <input className="form-input" value={form.name} onChange={set('name')} required />
          </div>

          {(isAdmin || target.role === 'cooperative') && (
            <div className="form-group">
              <label>Organisation name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(cooperatives)</span></label>
              <input className="form-input" value={form.orgName} onChange={set('orgName')} placeholder="e.g. Calabar Women Multi-Purpose Coop" />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-input" value={form.phone} onChange={set('phone')} placeholder="08030001122" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="form-input" value={form.role} onChange={set('role')} disabled={!canEditRole}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {!canEditRole && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {isSelf ? 'You cannot change your own role.' : 'Only an admin can change roles.'}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Address</label>
            <input className="form-input" value={form.address} onChange={set('address')} placeholder="Street, market, city" />
          </div>

          {canEditGroup && (
            <div className="form-group">
              <label>Assigned group</label>
              <select className="form-input" value={form.groupId} onChange={set('groupId')}>
                <option value="">— No group (loan borrower only) —</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          {/* Bank details */}
          <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '0.9rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <Landmark className="w-4 h-4 text-emerald-400" /> Bank details
            </div>
            <div className="form-group">
              <label>Bank name</label>
              <input className="form-input" value={form.bankName} onChange={set('bankName')} placeholder="e.g. Moniepoint MFB" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
              <div className="form-group">
                <label>Account number</label>
                <input className="form-input" value={form.accountNumber} onChange={set('accountNumber')} inputMode="numeric" placeholder="0123456789" />
              </div>
              <div className="form-group">
                <label>Account name</label>
                <input className="form-input" value={form.accountName} onChange={set('accountName')} />
              </div>
            </div>
          </div>

          {/* Contribution + withdrawal (thrift members) */}
          {target.role === 'member' || target.contributionAmount != null ? (
            <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '0.9rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <CalendarClock className="w-4 h-4 text-emerald-400" /> Contribution &amp; withdrawal
              </div>
              <div className="form-group">
                <label>Accepted contribution amount (per cycle)</label>
                {/* step="any": a fixed step (e.g. 50) would make the browser
                    reject any amount that is not 0/50/100… with "nearest valid
                    value" and the form would silently refuse to submit. */}
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="any"
                  value={form.contributionAmount}
                  onChange={set('contributionAmount')}
                  placeholder="e.g. 500"
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {form.contributionAmount
                    ? <>This is the amount the member agreed to pay each cycle — the keeping fee equals <strong style={{ color: 'var(--accent-gold)' }}>{formatNaira(Number(form.contributionAmount))}</strong>.</>
                    : 'Used for the contribution checklist and the keeping fee.'}
                </span>
              </div>
              {canEditWithdrawal && (
                <div className="form-group">
                  <label>Withdrawal date</label>
                  <input className="form-input" type="date" value={form.withdrawDate} onChange={set('withdrawDate')} />
                </div>
              )}
            </div>
          ) : null}

          {/* Mobile-friendly step actions */}
          <div className="step-actions">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
