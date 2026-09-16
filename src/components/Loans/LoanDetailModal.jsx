import React, { useState } from 'react';
import { X, CheckCircle2, HandCoins, Receipt } from 'lucide-react';
import { loanAPI } from '../../utils/api';
import { formatNaira, formatDate } from '../../utils/formatters';
import { loanBadge } from './loanMeta';

export default function LoanDetailModal({ loanId, onClose, isAdmin, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repay, setRepay] = useState({ amount: '', channel: 'Manual Transfer', reference: '', proof_note: '' });
  const [repayOpen, setRepayOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    loanAPI.detail(loanId)
      .then((d) => setData(d.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  React.useEffect(load, [loanId]);

  const canRepay = data && ['disbursed', 'active'].includes(data.loan.status);

  const submitRepayment = async (e) => {
    e.preventDefault();
    setError('');
    const amount = Number(repay.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid repayment amount greater than zero.');
      return;
    }
    // Guard against overpayment client-side so the user sees the limit before
    // submitting; the server enforces the same rule.
    const outstanding = Number(data?.loan?.outstanding_balance ?? 0);
    if (outstanding > 0 && amount > outstanding) {
      setError(`Amount exceeds the outstanding balance of ${formatNaira(outstanding)}.`);
      return;
    }
    setBusy(true);
    try {
      await loanAPI.submitRepayment(loanId, {
        amount,
        channel: repay.channel,
        reference: repay.reference || null,
        proof_note: repay.proof_note || null
      });
      setRepayOpen(false);
      setRepay({ amount: '', channel: 'Manual Transfer', reference: '', proof_note: '' });
      load();
      onChanged && onChanged();
    } catch (err) {
      setError(err.message || 'Failed to submit repayment');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (rid) => {
    if (!window.confirm('Verify this repayment and apply it to the loan schedule?')) return;
    setBusy(true);
    setError('');
    try {
      await loanAPI.verifyRepayment(rid);
      load();
      onChanged && onChanged();
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const review = async (action) => {
    let reason = null;
    if (action === 'reject') {
      const answer = window.prompt('Rejection reason:');
      // Cancel (null) must abort the action, not submit a default rejection.
      if (answer === null) return;
      reason = answer.trim() || 'Declined';
    }
    setBusy(true);
    setError('');
    try {
      await loanAPI.review(loanId, { action, rejection_reason: reason });
      load();
      onChanged && onChanged();
    } catch (err) {
      setError(err.message || 'Review failed');
    } finally {
      setBusy(false);
    }
  };

  const pendingRepayments = (data?.repayments || []).filter((r) => r.status === 'pending');

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '760px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Receipt className="w-5 h-5 text-emerald-400" /> Loan Details
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>
        )}

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}

        {data && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Summary card */}
            <div className="glass-card" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{data.loan.application_number}</span>
                    {loanBadge(data.loan.status)}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Borrower: <strong style={{ color: 'var(--text-main)' }}>{data.loan.borrower_name}</strong> • {data.loan.borrower_email}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Loan Amount</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-light)' }}>{formatNaira(data.loan.principal_amount)}</div>
                  {data.loan.account_number && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-gold)' }}>Account: {data.loan.account_number}</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '1rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Interest</span><br /><strong style={{ color: 'var(--text-main)' }}>{data.loan.interest_rate}% {data.loan.interest_type}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Tenure</span><br /><strong style={{ color: 'var(--text-main)' }}>{data.loan.tenure_months} months</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Frequency</span><br /><strong style={{ color: 'var(--text-main)' }}>{data.loan.repayment_frequency}</strong></div>
                {data.loan.outstanding_balance != null && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Outstanding</span><br /><strong style={{ color: 'var(--danger)' }}>{formatNaira(data.loan.outstanding_balance)}</strong></div>
                )}
                {data.loan.total_paid != null && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Total Paid</span><br /><strong style={{ color: 'var(--success)' }}>{formatNaira(data.loan.total_paid)}</strong></div>
                )}
                {data.loan.next_due_date && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Next Due</span><br /><strong style={{ color: 'var(--text-main)' }}>{formatDate(data.loan.next_due_date)}</strong></div>
                )}
              </div>

              {data.loan.purpose && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Purpose: <strong style={{ color: 'var(--text-main)' }}>{data.loan.purpose}</strong>
                </p>
              )}
              {data.loan.rejection_reason && (
                <p style={{ fontSize: '0.85rem', color: 'var(--danger-text)', marginTop: '0.5rem' }}>Rejection reason: {data.loan.rejection_reason}</p>
              )}

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                {isAdmin && ['pending', 'under_review'].includes(data.loan.status) && (
                  <>
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => review('approve')}>
                      <CheckCircle2 className="w-4 h-4" /> Approve & Disburse
                    </button>
                    <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => review('reject')}>Reject</button>
                  </>
                )}
                {!isAdmin && canRepay && (
                  <button className="btn btn-gold btn-sm" onClick={() => setRepayOpen((o) => !o)}>
                    <HandCoins className="w-4 h-4" /> Make Repayment
                  </button>
                )}
              </div>
            </div>

            {/* Repayment form */}
            {repayOpen && canRepay && (
              <form onSubmit={submitRepayment} className="glass-card" style={{ padding: '1.25rem', borderColor: 'var(--border-card-accent)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Submit Manual Repayment</h3>
                <div className="grid-2" style={{ gap: '0 1.25rem' }}>
                  <div className="form-group">
                    <label>Amount (₦)</label>
                    <input type="number" min={0} className="form-input" required value={repay.amount} onChange={(e) => setRepay({ ...repay, amount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Channel</label>
                    <select className="form-input" value={repay.channel} onChange={(e) => setRepay({ ...repay, channel: e.target.value })}>
                      {['Manual Transfer', 'Moniepoint', 'OPay', 'Zenith', 'First Bank', 'Access Bank', 'UBA', 'Cash at Market Stand', 'USSD'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reference</label>
                    <input type="text" className="form-input" value={repay.reference} onChange={(e) => setRepay({ ...repay, reference: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Proof Note</label>
                    <input type="text" className="form-input" placeholder="optional" value={repay.proof_note} onChange={(e) => setRepay({ ...repay, proof_note: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Submitting…' : 'Submit for Verification'}</button>
              </form>
            )}

            {/* Repayments */}
            {data.repayments && data.repayments.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Repayments</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th><th>Amount</th><th>Channel</th><th>Reference</th><th>Status</th>{isAdmin && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.repayments.map((r) => (
                        <tr key={r.id}>
                          <td>{formatDate(r.submitted_at)}</td>
                          <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatNaira(r.amount)}</td>
                          <td>{r.channel}</td>
                          <td>{r.reference || '—'}</td>
                          <td>{loanBadge(r.status)}</td>
                          {isAdmin && (
                            <td>
                              {r.status === 'pending' && (
                                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => verify(r.id)}>Verify</button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Schedule */}
            {data.schedule && data.schedule.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Repayment Schedule ({data.schedule.length} installments)</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th><th>Due Date</th><th>Principal</th><th>Interest</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.schedule.map((s) => (
                        <tr key={s.id || s.installment_number}>
                          <td>{s.installment_number}</td>
                          <td>{formatDate(s.due_date)}</td>
                          <td>{formatNaira(s.principal_component)}</td>
                          <td>{formatNaira(s.interest_component)}</td>
                          <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatNaira(s.total_installment)}</td>
                          <td>{formatNaira(s.amount_paid || 0)}</td>
                          <td>{formatNaira(s.outstanding_balance)}</td>
                          <td>{loanBadge(s.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {pendingRepayments.length > 0 && isAdmin && (
              <p style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>{pendingRepayments.length} repayment(s) awaiting verification above.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
