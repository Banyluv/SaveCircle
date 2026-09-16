import React, { useState, useEffect } from 'react';
import { X, User, Building2, UserPlus, Calculator, FileText, CheckCircle2 } from 'lucide-react';
import { loanAPI } from '../../utils/api';
import { formatNaira } from '../../utils/formatters';
import { LOAN_TYPE_LABELS, INTEREST_TYPE_LABELS, FREQUENCY_LABELS } from './loanMeta';

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'lump_sum'];
const LOAN_TYPES = ['personal', 'business', 'cooperative', 'emergency', 'mortgage', 'auto'];
const INTEREST_TYPES = ['flat', 'reducing', 'compound'];

// Registers a NEW loan-only borrower (individual or cooperative) with a login
// account, then (optionally, in the same flow) files a loan application on
// their behalf. Admins/superadmin only.
export default function AddBorrowerModal({ onClose, onAdded }) {
  const [tab, setTab] = useState('individual'); // 'individual' | 'cooperative'

  // Registration fields
  const [reg, setReg] = useState({
    name: '', email: '', password: '', phone: '',
    address: '', bankName: '', accountNumber: '', accountName: ''
  });
  // Cooperative extra
  const [orgName, setOrgName] = useState('');

  // Loan-on-behalf fields (step 2)
  const [wantLoan, setWantLoan] = useState(false);
  const [registered, setRegistered] = useState(null); // { id, name, role, email }
  const [products, setProducts] = useState([]);
  const [loanForm, setLoanForm] = useState({
    product_id: '', loan_type: 'personal', principal_amount: '', interest_rate: '5',
    interest_type: 'flat', tenure_months: '6', repayment_frequency: 'monthly',
    purpose: '', collateral: ''
  });
  const [quote, setQuote] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [doneMsg, setDoneMsg] = useState('');

  useEffect(() => {
    loanAPI.products()
      .then((d) => setProducts(Array.isArray(d.data) ? d.data : []))
      .catch(() => setProducts([]));
  }, []);

  const setR = (k, v) => setReg((f) => ({ ...f, [k]: v }));
  const setL = (k, v) => setLoanForm((f) => ({ ...f, [k]: v }));

  const handleProductSelect = (e) => {
    const pid = e.target.value;
    setL('product_id', pid);
    if (!pid) return;
    const p = products.find((x) => String(x.id) === String(pid));
    if (!p) return;
    const mid = (Number(p.min_interest_rate) + Number(p.max_interest_rate)) / 2;
    const mTenure = Math.max(Number(p.min_tenure_months), 1);
    setLoanForm((f) => ({
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

  // Live quote for the on-behalf loan
  useEffect(() => {
    if (!wantLoan || !registered) return;
    const t = setTimeout(async () => {
      setCalculating(true);
      setError('');
      try {
        if (loanForm.principal_amount && loanForm.interest_rate && loanForm.tenure_months) {
          const d = await loanAPI.calculate({
            principal: Number(loanForm.principal_amount),
            annualRate: Number(loanForm.interest_rate),
            tenureMonths: Number(loanForm.tenure_months),
            frequency: loanForm.repayment_frequency,
            interestType: loanForm.interest_type,
            processingFeePercent: 0
          });
          setQuote(d.data);
        } else {
          setQuote(null);
        }
      } catch (e) {
        setQuote(null);
      } finally {
        setCalculating(false);
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantLoan, registered, loanForm.principal_amount, loanForm.interest_rate, loanForm.tenure_months, loanForm.repayment_frequency, loanForm.interest_type]);

  // Step 1: register
  const registerBorrower = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const isCoop = tab === 'cooperative';
      const payload = {
        name: isCoop ? (reg.name || orgName) : reg.name,
        email: reg.email,
        password: reg.password,
        role: isCoop ? 'cooperative' : 'individual',
        bankName: reg.bankName || null,
        accountNumber: reg.accountNumber || null,
        accountName: reg.accountName || null,
        orgName: isCoop ? orgName : null,
        phone: reg.phone || null,
        address: reg.address || null
      };
      const d = await loanAPI.registerBorrower(payload);
      setRegistered({ id: d.id, name: d.name || d.orgName, role: d.role, email: d.email });
      setDoneMsg(`✅ ${isCoop ? 'Cooperative' : 'Individual'} account created for ${d.name} (${d.email}). They can log in with the password you set.`);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  // Step 2: file a loan on the borrower's behalf
  const applyForBorrower = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await loanAPI.applyOnBehalf({
        loan_type: loanForm.loan_type,
        principal_amount: Number(loanForm.principal_amount),
        interest_rate: Number(loanForm.interest_rate),
        interest_type: loanForm.interest_type,
        tenure_months: Number(loanForm.tenure_months),
        repayment_frequency: loanForm.repayment_frequency,
        purpose: loanForm.purpose || null,
        collateral: loanForm.collateral || null,
        product_id: loanForm.product_id ? Number(loanForm.product_id) : null,
        borrower_id: registered.id
      });
      setDoneMsg(`✅ Loan application submitted for ${registered.name}. An admin can approve it in the portfolio.`);
      setTimeout(() => { onAdded && onAdded(); onClose(); }, 1500);
    } catch (err) {
      setError(err.message || 'Loan application failed');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setError('');
    setDoneMsg('');
    setRegistered(null);
    setWantLoan(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus className="w-5 h-5 text-emerald-400" /> Add Loan Borrower
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>
        )}
        {doneMsg && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.9rem' }}>{doneMsg}</div>
        )}

        {!registered ? (
          /* ───────── STEP 1: Register ───────── */
          <>
            {/* Type selector */}
            <div className="tab-list" style={{ marginBottom: '1.25rem' }}>
              <button className={`tab-item ${tab === 'individual' ? 'active' : ''}`} onClick={() => setTab('individual')}>
                <User className="w-4 h-4" /> Individual
              </button>
              <button className={`tab-item ${tab === 'cooperative' ? 'active' : ''}`} onClick={() => setTab('cooperative')}>
                <Building2 className="w-4 h-4" /> Cooperative
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {tab === 'individual'
                ? 'Register a person who wants loans only (not part of a SaveCircle group).'
                : 'Register an organisation / cooperative that wants loan services.'}
            </p>

            <form onSubmit={registerBorrower} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
                {tab === 'cooperative' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Cooperative / Organisation Name</label>
                    <input className="form-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="e.g. Calabar Women Multi-Purpose Coop" />
                  </div>
                )}
                <div className="form-group">
                  <label>{tab === 'cooperative' ? 'Contact Person Name' : 'Full Name'}</label>
                  <input className="form-input" value={reg.name} onChange={(e) => setR('name', e.target.value)} required={tab === 'individual'} placeholder={tab === 'cooperative' ? 'e.g. Mrs. Ngozi Edem' : 'e.g. Ada Obi'} />
                </div>
                <div className="form-group">
                  <label>Email Address (for login)</label>
                  <input type="email" className="form-input" value={reg.email} onChange={(e) => setR('email', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Login Password</label>
                  <input type="text" className="form-input" value={reg.password} onChange={(e) => setR('password', e.target.value)} required placeholder="e.g. borrow123" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input className="form-input" value={reg.phone} onChange={(e) => setR('phone', e.target.value)} placeholder="e.g. 08012345678" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Address</label>
                  <input className="form-input" value={reg.address} onChange={(e) => setR('address', e.target.value)} placeholder="e.g. Watt Market, Calabar" />
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-card-accent)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--success-bg)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-light)', marginBottom: '0.75rem' }}>Bank Details (for loan disbursement & repayments)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input className="form-input" value={reg.bankName} onChange={(e) => setR('bankName', e.target.value)} placeholder="e.g. Zenith Bank" />
                  </div>
                  <div className="form-group">
                    <label>Account Number</label>
                    <input className="form-input" value={reg.accountNumber} onChange={(e) => setR('accountNumber', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Account Name</label>
                    <input className="form-input" value={reg.accountName} onChange={(e) => setR('accountName', e.target.value)} />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Creating…' : 'Register Account'}
              </button>
            </form>
          </>
        ) : (
          /* ───────── STEP 2: Loan on behalf? ───────── */
          <div>
            <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', background: 'var(--success-bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-light)', fontWeight: 700 }}>
                <CheckCircle2 className="w-5 h-5" /> Account ready
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '0.4rem' }}>
                <strong>{registered.name}</strong> <span style={{ color: 'var(--text-muted)' }}>({registered.role === 'cooperative' ? 'Cooperative' : 'Individual'} • {registered.email})</span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <button className="btn btn-gold" onClick={() => setWantLoan(true)}>
                <FileText className="w-4 h-4" /> Apply for a loan on their behalf
              </button>
              <button className="btn btn-outline" onClick={onClose}>Done — no loan now</button>
              <button className="btn btn-outline" onClick={reset} style={{ color: 'var(--text-muted)' }}>Register another</button>
            </div>

            {wantLoan && (
              <form onSubmit={applyForBorrower}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem' }}>
                  {products.length > 0 && (
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Loan Product Template</label>
                      <select className="form-input" value={loanForm.product_id} onChange={handleProductSelect}>
                        <option value="">— Custom loan —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({LOAN_TYPE_LABELS[p.loan_type] || p.loan_type})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Loan Type</label>
                    <select className="form-input" value={loanForm.loan_type} onChange={(e) => setL('loan_type', e.target.value)}>
                      {LOAN_TYPES.map((t) => <option key={t} value={t}>{LOAN_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (₦)</label>
                    <input type="number" min={0} className="form-input" value={loanForm.principal_amount} onChange={(e) => setL('principal_amount', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Interest Rate (% / year)</label>
                    <input type="number" step="0.1" className="form-input" value={loanForm.interest_rate} onChange={(e) => setL('interest_rate', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Interest Mode</label>
                    <select className="form-input" value={loanForm.interest_type} onChange={(e) => setL('interest_type', e.target.value)}>
                      {INTEREST_TYPES.map((t) => <option key={t} value={t}>{INTEREST_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tenure (months)</label>
                    <input type="number" min={1} className="form-input" value={loanForm.tenure_months} onChange={(e) => setL('tenure_months', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Repayment Frequency</label>
                    <select className="form-input" value={loanForm.repayment_frequency} onChange={(e) => setL('repayment_frequency', e.target.value)}>
                      {FREQUENCIES.map((f) => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Purpose</label>
                    <input className="form-input" value={loanForm.purpose} onChange={(e) => setL('purpose', e.target.value)} placeholder="e.g. Business expansion" />
                  </div>
                </div>

                {calculating && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calculating…</p>}
                {quote && !calculating && (
                  <div className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', background: 'var(--success-bg)', borderColor: 'var(--border-card-accent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: 'var(--primary-light)', fontWeight: 700 }}>
                      <Calculator className="w-4 h-4" /> Repayment Quote
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', fontSize: '0.85rem' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Total Payable</span><br /><strong style={{ color: 'var(--text-main)' }}>{formatNaira(quote.summary.totalPayable)}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Interest</span><br /><strong style={{ color: 'var(--accent-gold)' }}>{formatNaira(quote.summary.totalInterest)}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Per Installment</span><br /><strong style={{ color: 'var(--text-main)' }}>{formatNaira(quote.summary.installmentAmount)}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Installments</span><br /><strong style={{ color: 'var(--text-main)' }}>{quote.summary.installments}</strong></div>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Submitting…' : 'Submit Loan Application'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
