import React, { useState } from 'react';
import { formatNaira } from '../utils/formatters';
import { Wallet, CheckCircle2, X, Upload } from 'lucide-react';

export default function LogPaymentModal({ group, onClose, onSubmitPayment }) {
  if (!group) return null;

  const [memberId, setMemberId] = useState(group.members[0]?.id || '');
  const [channel, setChannel] = useState('Moniepoint MFB');
  const [refNumber, setRefNumber] = useState(`TX-${Math.floor(100000 + Math.random() * 900000)}`);
  const [proofNote, setProofNote] = useState('');
  const [status, setStatus] = useState('Verified'); // Default verified or pending

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!memberId) return;

    onSubmitPayment({
      groupId: group.id,
      cycleIndex: group.currentCycleIndex,
      memberId,
      channel,
      ref: refNumber,
      proofNote,
      status
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Log Contribution Payment
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {group.name} &bull; Cycle {group.currentCycleIndex}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Member Select */}
          <div className="form-group">
            <label>Select Member:</label>
            <select 
              className="form-control"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
            >
              {group.members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role}) - {m.bank}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Box */}
          <div className="form-group">
            <label>Contribution Amount Required:</label>
            <div className="form-control" style={{ background: 'rgba(0, 135, 81, 0.12)', color: 'var(--primary-light)', fontWeight: 700, fontSize: '1.1rem' }}>
              {formatNaira(group.contributionAmount)}
            </div>
          </div>

          {/* Payment Channel */}
          <div className="form-group">
            <label>Payment Channel / Bank:</label>
            <select 
              className="form-control"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="Moniepoint MFB">Moniepoint Microfinance Bank</option>
              <option value="OPay Nigeria">OPay Nigeria</option>
              <option value="Zenith Bank Transfer">Zenith Bank Transfer</option>
              <option value="First Bank Nigeria Mobile">First Bank Nigeria (*894# / Mobile)</option>
              <option value="Access Bank">Access Bank</option>
              <option value="UBA Mobile Banking">United Bank for Africa (UBA)</option>
              <option value="Cash at Shop / Market Stand">Cash handed to Trustee (Watt/Marian Market)</option>
              <option value="Palmpay">Palmpay</option>
              <option value="Kuda Bank">Kuda Microfinance</option>
            </select>
          </div>

          {/* Transaction Ref */}
          <div className="form-group">
            <label>Transaction Reference / Session ID:</label>
            <input 
              type="text" 
              className="form-control"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder="e.g. MNP-20260730-1092"
              required
            />
          </div>

          {/* Note / Proof description */}
          <div className="form-group">
            <label>Note / Proof of Payment details:</label>
            <textarea 
              className="form-control"
              rows="2"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              placeholder="e.g. Transferred from Shop account or paid cash at Watt Market Stand #12"
            />
          </div>

          {/* Verification Status option */}
          <div className="form-group">
            <label>Initial Status:</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="status" 
                  value="Verified"
                  checked={status === 'Verified'}
                  onChange={() => setStatus('Verified')}
                />
                <span className="badge badge-success">Verified</span> (Confirmed by Trustee)
              </label>

              <label style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="status" 
                  value="Pending Verification"
                  checked={status === 'Pending Verification'}
                  onChange={() => setStatus('Pending Verification')}
                />
                <span className="badge badge-warning">Pending</span> (Awaiting confirmation)
              </label>
            </div>
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <CheckCircle2 className="w-4 h-4" /> Save Contribution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
