import React from 'react';
import { formatNaira, formatDate } from '../utils/formatters';
import { ShieldCheck, Download, Printer, X, MapPin, CheckCircle2 } from 'lucide-react';

export default function ReceiptModal({ receiptData, onClose }) {
  if (!receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', background: '#0d1524', border: '1px solid var(--border-card-accent)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Digital Payment Receipt</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div id="receipt-paper" style={{
          background: 'linear-gradient(180deg, #111c2e 0%, #0b1320 100%)',
          border: '1px dashed var(--border-card-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          position: 'relative'
        }}>
          {/* Top Stamp */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
            <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>
              Official Nigerian Thrift Record
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {receiptData.groupName}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
              <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {receiptData.hubLocation || 'Calabar, Cross River State'}
            </p>
          </div>

          {/* Amount Paid Box */}
          <div style={{
            background: 'rgba(0, 135, 81, 0.15)',
            border: '1px solid rgba(0, 135, 81, 0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Amount Paid
            </span>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-light)' }}>
              {formatNaira(receiptData.amount)}
            </h1>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Cycle {receiptData.cycleIndex} Contribution
            </span>
          </div>

          {/* Receipt Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Member Name:</span>
              <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{receiptData.memberName}</p>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Payment Date:</span>
              <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatDate(receiptData.date)}</p>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Payment Channel:</span>
              <p style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{receiptData.channel || 'Direct Transfer'}</p>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ref / Tx Hash:</span>
              <p style={{ fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {receiptData.ref || 'REF-NIG-001'}
              </p>
            </div>
          </div>

          {receiptData.proofNote && (
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Member Note:</span>
              <p style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>"{receiptData.proofNote}"</p>
            </div>
          )}

          {/* Verification Signature */}
          <div style={{
            marginTop: '1.25rem',
            paddingTop: '0.9rem',
            borderTop: '1px dashed var(--border-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Verified By (Iya Ajo):</span>
              <p style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{receiptData.trustee || 'Group Trustee'}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6ee7b7' }}>
              <CheckCircle2 className="w-4 h-4" /> VERIFIED
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
          <button onClick={handlePrint} className="btn btn-outline btn-sm">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button onClick={onClose} className="btn btn-primary btn-sm">
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
