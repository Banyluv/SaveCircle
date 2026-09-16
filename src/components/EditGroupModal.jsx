import React, { useEffect, useState } from 'react';
import { X, Save, Wallet, Landmark, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, authFetch } from '../utils/api';
import { formatNaira } from '../utils/formatters';

// Edits an existing SaveCircle group.
//
// There is no dedicated group-update endpoint: groups are stored as whole
// documents and written through POST /api/groups/sync, which already enforces
// that an admin may only write their own group and a superadmin may write any.
// So this dialog sends one-element arrays and replaces that group's document.
//
// On mobile the form is split into two steps (Details → Money & account) so the
// fields are not one long scroll, with explicit Back/Next controls.
const FREQUENCIES = ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly'];

export default function EditGroupModal({ group, onClose, onSaved }) {
  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    hubLocation: '',
    description: '',
    trustee: '',
    trusteeContact: '',
    contributionAmount: '',
    frequency: 'Weekly',
    penaltyFee: '',
    totalCycles: '',
    currentCycleIndex: '',
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  useEffect(() => {
    if (!group) return;
    setForm({
      name: group.name || '',
      hubLocation: group.hubLocation || '',
      description: group.description || '',
      trustee: group.trustee || '',
      trusteeContact: group.trusteeContact || '',
      contributionAmount: group.contributionAmount != null ? String(group.contributionAmount) : '',
      frequency: group.frequency || 'Weekly',
      penaltyFee: group.penaltyFee != null ? String(group.penaltyFee) : '',
      totalCycles: group.totalCycles != null ? String(group.totalCycles) : '',
      currentCycleIndex: group.currentCycleIndex != null ? String(group.currentCycleIndex) : '',
      bankName: group.groupAccount?.bankName || '',
      accountNumber: group.groupAccount?.accountNumber || '',
      accountName: group.groupAccount?.accountName || ''
    });
    setStep(1);
    setError('');
  }, [group]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Step 1 fields must be valid before the user can move on, otherwise they
  // reach "Save" on step 2 with an empty required field and get a failure.
  const step1Valid = form.name.trim().length > 0
    && form.contributionAmount !== ''
    && Number(form.contributionAmount) > 0;

  const goNext = () => {
    if (!step1Valid) {
      setError('A group name and a contribution amount greater than zero are required.');
      return;
    }
    setError('');
    setStep(2);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!group?.id) return;
    if (!step1Valid) {
      setStep(1);
      setError('A group name and a contribution amount greater than zero are required.');
      return;
    }

    setSaving(true);
    setError('');

    const amount = Number(form.contributionAmount) || 0;
    const total = Number(form.totalCycles) || (group.members?.length || 0);

    // Spread the existing document so members, contributions and payout
    // schedule are preserved — sync replaces the whole record.
    const updated = {
      ...group,
      name: form.name.trim(),
      hubLocation: form.hubLocation.trim(),
      description: form.description,
      trustee: form.trustee,
      trusteeContact: form.trusteeContact,
      contributionAmount: amount,
      frequency: form.frequency,
      penaltyFee: Number(form.penaltyFee) || 0,
      totalCycles: total,
      currentCycleIndex: Number(form.currentCycleIndex) || group.currentCycleIndex || 1,
      groupAccount: {
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim()
      }
    };

    try {
      const res = await authFetch('/api/groups/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([updated])
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || `Could not save the group (${res.status})`);
        return;
      }
      if (onSaved) onSaved(updated);
      onClose();
    } catch (err) {
      setError('Network error — could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  if (!group) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wallet className="w-5 h-5 text-emerald-400" /> Edit Group
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {group.name}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          {[1, 2].map((n) => (
            <React.Fragment key={n}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.78rem', fontWeight: 800,
                background: step >= n ? 'var(--brand-gradient)' : 'var(--neutral-bg)',
                color: step >= n ? 'var(--on-brand)' : 'var(--text-muted)'
              }}>{n}</div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: step === n ? 'var(--text-main)' : 'var(--text-muted)' }}>
                {n === 1 ? 'Group details' : 'Money & account'}
              </span>
              {n === 1 && <span style={{ flex: 1, height: '1px', background: 'var(--border-card)' }} />}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '0.7rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
            <AlertTriangle className="w-4 h-4" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {step === 1 && (
            <>
              <div className="form-group">
                <label>Group name</label>
                <input className="form-input" value={form.name} onChange={set('name')} required />
              </div>

              <div className="form-group">
                <label>Location / market / city</label>
                <input className="form-input" value={form.hubLocation} onChange={set('hubLocation')} placeholder="e.g. Watt Market, Calabar" />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea className="form-input" rows={3} value={form.description} onChange={set('description')} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <div className="form-group">
                  <label>Trustee (Iya SaveCircle)</label>
                  <input className="form-input" value={form.trustee} onChange={set('trustee')} />
                </div>
                <div className="form-group">
                  <label>Trustee contact</label>
                  <input className="form-input" value={form.trusteeContact} onChange={set('trusteeContact')} placeholder="08030001122" />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <div className="form-group">
                  <label>Contribution amount</label>
                  {/* No `step`: with min="1" a step of 50 makes valid values
                      1, 51, 101…, so a round amount like 100000 is rejected by
                      the browser with "nearest valid values are 99951 and
                      100001" and the form never submits. `any` accepts
                      whatever the admin types, which is what we want here. */}
                  <input className="form-input" type="number" min="1" step="any" value={form.contributionAmount} onChange={set('contributionAmount')} required />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Per member, per cycle — the keeping fee equals {form.contributionAmount ? formatNaira(Number(form.contributionAmount)) : 'one contribution'}.
                  </span>
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <select className="form-input" value={form.frequency} onChange={set('frequency')}>
                    {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.9rem' }}>
                <div className="form-group">
                  <label>Penalty fee</label>
                  <input className="form-input" type="number" min="0" step="any" value={form.penaltyFee} onChange={set('penaltyFee')} />
                </div>
                <div className="form-group">
                  <label>Total cycles</label>
                  <input className="form-input" type="number" min="1" value={form.totalCycles} onChange={set('totalCycles')} />
                </div>
                <div className="form-group">
                  <label>Current cycle</label>
                  <input className="form-input" type="number" min="1" value={form.currentCycleIndex} onChange={set('currentCycleIndex')} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '0.9rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  <Landmark className="w-4 h-4 text-emerald-400" /> Group bank account
                </div>
                <div className="form-group">
                  <label>Bank name</label>
                  <input className="form-input" value={form.bankName} onChange={set('bankName')} placeholder="e.g. Zenith Bank" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                  <div className="form-group">
                    <label>Account number</label>
                    <input className="form-input" value={form.accountNumber} onChange={set('accountNumber')} inputMode="numeric" />
                  </div>
                  <div className="form-group">
                    <label>Account name</label>
                    <input className="form-input" value={form.accountName} onChange={set('accountName')} />
                  </div>
                </div>
              </div>
            </>
          )}

          {!isSuper && step === 2 && (
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              You are editing your own group. Only a super admin can reassign members between groups.
            </p>
          )}

          {/* Back / Next / Save — always visible at the bottom of the modal */}
          <div className="step-actions">
            {step === 1 ? (
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
            ) : (
              <button type="button" onClick={() => { setError(''); setStep(1); }} className="btn btn-outline">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            {step === 1 ? (
              <button type="button" onClick={goNext} className="btn btn-primary">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
