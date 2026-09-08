import React, { useState, useEffect } from 'react';
import { X, Calculator, FileText } from 'lucide-react';
import { loanAPI } from '../../utils/api';
import { formatNaira } from '../../utils/formatters';
import { LOAN_TYPE_LABELS, INTEREST_TYPE_LABELS, FREQUENCY_LABELS } from './loanMeta';

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'lump_sum'];
const LOAN_TYPES = ['personal', 'business', 'cooperative', 'emergency', 'mortgage', 'auto'];
const INTEREST_TYPES = ['flat', 'reducing', 'compound'];

export default function ApplyLoanModal({ onClose, onApplied }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    product_id: '',
    loan_type: 'personal',
    principal_amount: '',
    interest_rate: '5',
    interest_type: 'flat',
    tenure_months: '6',
    repayment_frequency: 'monthly',
    purpose: '',
    collateral: ''
  });
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loanAPI.products()
      .then((d) => setProducts(Array.isArray(d.data) ? d.data : []))
      .catch(() => setProducts([]));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleProductSelect = (e) => {
    const pid = e.target.value;
    set('product_id', pid);
    if (!pid) return;
    const p = products.find((x) => String(x.id) === String(pid));
    if (!p) return;
    const mid = (Number(p.min_interest_rate) + Number(p.max_interest_rate)) / 2;
    const mTenure = Math.max(Number(p.min_tenure_months), 1);
    setForm((f) => ({
      ...f,
      product_id: pid,
      loan_type: p.loan_type || f.loan_type,
      interest_rate: mid ? String(mid) : f.interest_rate,
      interest_type: p.interest_type || f.interest_type,
      repayment_frequency: p.repayment_frequency || f.repayment_frequency,
      tenure_months: String(mTenure || f.tenure_months),
      principal_amount: f.principal_amount || String(p.max_amount || '')
    }));
  };

  const runQuote = async () => {
    setError('');
    setQuote(null);
    if (!form.principal_amount || !form.interest_rate || !form.tenure_months) return;
    try {
      setLoading(true);
      const d = await loanAPI.calculate({
        principal: Number(form.principal_amount),
        annualRate: Number(form.interest_rate),
        tenureMonths: Number(form.tenure_months),
        frequency: form.repayment_frequency,
        interestType: form.interest_type,
        processingFeePercent: 0
      });
      setQuote(d.data);
    } catch (err) {
      setError(err.message || 'Could not generate quote');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(runQuote, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.principal_amount, form.interest_rate, form.tenure_months, form.repayment_frequency, form.interest_type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        loan_type: form.loan_type,
        principal_amount: Number(form.principal_amount),
        interest_rate: Number(form.interest_rate),
        interest_type: form.interest_type,
        tenure_months: Number(form.tenure_months),
        repayment_frequency: form.repayment_frequency,
        purpose: form.purpose || null,
        collateral: form.collateral || null,
        product_id: form.product_id ? Number(form.product_id) : null
      };
      const d = await loanAPI.apply(payload);
      setSuccess(`Application ${d.data.application_number} submitted successfully! An admin will review it.`);
      setTimeout(() => { onApplied && onApplied(d.data); onClose(); }, 1600);
    } catch (err) {
      setError(err.message || 'Application failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText className="w-5 h-5 text-emerald-400" /> Apply for a Loan
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>
        )}
        {success && (
          <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>{success}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
            {products.length > 0 && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Loan Product Template (optional — auto-fills terms)</label>
                <select className="form-input" value={form.product_id} onChange={handleProductSelect}>
                  <option value="">— Custom loan —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({LOAN_TYPE_LABELS[p.loan_type] || p.loan_type})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Loan Type</label>
              <select className="form-input" value={form.loan_type} onChange={(e) => set('loan_type', e.target.value)}>
                {LOAN_TYPES.map((t) => <option key={t} value={t}>{LOAN_TYPE_LABELS[t]}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Amount (₦)</label>
              <input type="number" min={0} className="form-input" value={form.principal_amount} onChange={(e) => set('principal_amount', e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Interest Rate (% per year)</label>
              <input type="number" step="0.1" min={0} className="form-input" value={form.interest_rate} onChange={(e) => set('interest_rate', e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Interest Mode</label>
              <select className="form-input" value={form.interest_type} onChange={(e) => set('interest_type', e.target.value)}>
                {INTEREST_TYPES.map((t) => <option key={t} value={t}>{INTEREST_TYPE_LABELS[t]}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Tenure (months)</label>
              <input type="number" min={1} className="form-input" value={form.tenure_months} onChange={(e) => set('tenure_months', e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Repayment Frequency</label>
              <select className="form-input" value={form.repayment_frequency} onChange={(e) => set('repayment_frequency', e.target.value)}>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Purpose</label>
            <input type="text" className="form-input" placeholder="e.g. Stock for my shop" value={form.purpose} onChange={(e) => set('purpose', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Collateral / Guarantor Notes (optional)</label>
            <input type="text" className="form-input" placeholder="e.g. Market stall title, guarantor name" value={form.collateral} onChange={(e) => set('collateral', e.target.value)} />
          </div>

          {loading && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calculating…</p>}
          {quote && !loading && (
            <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', background: 'rgba(0,135,81,0.06)', borderColor: 'var(--border-card-accent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: 'var(--primary-light)', fontWeight: 700 }}>
                <Calculator className="w-4 h-4" /> Repayment Quote
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Total Payable</span><br /><strong style={{ color: 'var(--text-main)' }}>{formatNaira(quote.summary.totalPayable)}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Total Interest</span><br /><strong style={{ color: 'var(--accent-gold)' }}>{formatNaira(quote.summary.totalInterest)}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Per Installment</span><br /><strong style={{ color: 'var(--text-main)' }}>{formatNaira(quote.summary.installmentAmount)}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Installments</span><br /><strong style={{ color: 'var(--text-main)' }}>{quote.summary.installments}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>First Due</span><br /><strong style={{ color: 'var(--text-main)' }}>{quote.summary.firstPaymentDate || '—'}</strong></div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
