import React, { useEffect, useState } from 'react';
import { Landmark, Save, CheckCircle2, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { settingsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

// Superadmin screen for the platform-wide "central account" that all groups pay
// into. Group admins have their own group account and can only READ this one.
export default function CentralAccount({ onNotify }) {
  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';

  const [form, setForm] = useState({
    bankName: '', accountNumber: '', accountName: '', note: '', active: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    let cancelled = false;
    settingsAPI.getCentralAccount()
      .then((res) => {
        if (cancelled) return;
        const d = res?.data || {};
        setForm({
          bankName: d.bankName || '',
          accountNumber: d.accountNumber || '',
          accountName: d.accountName || '',
          note: d.note || '',
          active: Boolean(d.active)
        });
      })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load the central account'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaved('');
    setSaving(true);
    try {
      const res = await settingsAPI.updateCentralAccount(form);
      const d = res?.data || {};
      setForm({
        bankName: d.bankName || '', accountNumber: d.accountNumber || '',
        accountName: d.accountName || '', note: d.note || '', active: Boolean(d.active)
      });
      setSaved('Central account saved.');
      if (onNotify) onNotify('Central account updated', 'success');
    } catch (err) {
      setError(err.message || 'Failed to save the central account');
    } finally {
      setSaving(false);
    }
  };

  const readOnly = !isSuper;

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Landmark className="w-6 h-6 text-emerald-400" /> Central Account
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          The platform account that all group contributions are paid into.
        </p>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          {/* Current status banner */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
            background: form.active ? 'var(--success-bg)' : 'var(--warning-bg)',
            border: `1px solid ${form.active ? 'var(--success-border)' : 'var(--warning-border)'}`,
            borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem', marginBottom: '1.25rem',
            fontSize: '0.86rem'
          }}>
            {form.active
              ? <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--success-text)', flexShrink: 0 }} />
              : <AlertTriangle className="w-5 h-5" style={{ color: 'var(--warning-text)', flexShrink: 0 }} />}
            <div>
              <strong style={{ color: form.active ? 'var(--success-text)' : 'var(--warning-text)' }}>
                {form.active ? 'Active — members and admins see this account' : 'Not active — nobody is shown this account yet'}
              </strong>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {form.active
                  ? 'Contributions should be paid into the account below.'
                  : 'Fill in the bank details and tick “Active” to publish it to all groups.'}
              </div>
            </div>
          </div>

          {readOnly && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem',
              fontSize: '0.82rem', color: 'var(--text-muted)'
            }}>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Only a super admin can change the central account. You can view where to pay.
            </div>
          )}

          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
          {saved && !error && (
            <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>
              {saved}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="grid-2" style={{ gap: '0 1.25rem' }}>
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  className="form-input"
                  value={form.bankName}
                  onChange={set('bankName')}
                  placeholder="e.g. Zenith Bank"
                  disabled={readOnly}
                />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input
                  className="form-input"
                  value={form.accountNumber}
                  onChange={set('accountNumber')}
                  placeholder="e.g. 1012345678"
                  inputMode="numeric"
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Account Name</label>
              <input
                className="form-input"
                value={form.accountName}
                onChange={set('accountName')}
                placeholder="e.g. SaveCircle Central Pool"
                disabled={readOnly}
              />
            </div>

            <div className="form-group">
              <label>Note shown to members (optional)</label>
              <textarea
                className="form-input"
                rows="2"
                value={form.note}
                onChange={set('note')}
                placeholder="e.g. Use your full name as the transfer narration."
                disabled={readOnly}
              />
            </div>

            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.55rem',
              fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '1.1rem',
              cursor: readOnly ? 'not-allowed' : 'pointer'
            }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={set('active')}
                disabled={readOnly}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
              />
              Active — publish this account to all groups
            </label>

            {!readOnly && (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Central Account'}
              </button>
            )}
          </form>
        </div>
      )}

      {/* How this relates to group accounts */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--accent-gold)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Info className="w-5 h-5" style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--text-main)' }}>Central account and group accounts work together.</strong>
            <div style={{ marginTop: '0.25rem' }}>
              When this account is active it is shown as the primary destination for contributions.
              Each group can still keep its own bank account for payouts and local records — group admins
              manage theirs from the group page. Only a super admin can edit the central account.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
