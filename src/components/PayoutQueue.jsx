import React from 'react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { formatNaira, formatDate, getDaysRemaining } from '../utils/formatters';
import { Award, ArrowLeftRight, CheckCircle2, Calendar, MapPin, Send, Banknote } from 'lucide-react';

export default function PayoutQueue({ group, onOpenSwapModal, onDisbursePayout }) {
  const { user } = useAuth();
  const isAdminUser = ['admin', 'superadmin', 'trustee'].includes(user?.role);
  if (!group) return null;

  const currentRecipientItem = group.payoutSchedule.find(s => s.cycle === group.currentCycleIndex);
  const currentRecipientMember = group.members.find(m => m.id === currentRecipientItem?.memberId);

  const handleDisburseClick = () => {
    // Trigger celebratory confetti effect
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Ignore if confetti fails in headless
    }

    if (currentRecipientItem) {
      onDisbursePayout(group.id, group.currentCycleIndex);
    }
  };

  return (
    <div>
      {/* Current Recipient Highlight Banner */}
      {currentRecipientItem && currentRecipientMember && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.3) 0%, rgba(245, 158, 11, 0.2) 100%)',
          border: '1px solid var(--primary-light)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          marginBottom: '2rem',
          position: 'relative',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span className="badge badge-warning">
                  <Award className="w-3.5 h-3.5" /> Turn #{currentRecipientMember.position} - Current Recipient
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cycle {group.currentCycleIndex}</span>
              </div>
              
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {currentRecipientMember.name}
              </h2>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <Banknote className="w-4 h-4 text-emerald-400" /> Bank: <strong style={{ color: 'var(--accent-gold)' }}>{currentRecipientMember.bank}</strong> &bull; Acc: <span style={{ fontFamily: 'monospace' }}>{currentRecipientMember.accountNumber}</span>
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Lump-Sum Payout Pool
              </span>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                {formatNaira(currentRecipientItem.amount)}
              </h1>

              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                {isAdminUser && (
                  <>
                    <button 
                      onClick={onOpenSwapModal}
                      className="btn btn-sm btn-outline"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Request Turn Swap
                    </button>

                    {currentRecipientItem.status !== 'Disbursed' ? (
                      <button 
                        onClick={handleDisburseClick}
                        className="btn btn-sm btn-gold"
                      >
                        <Send className="w-3.5 h-3.5" /> Disburse Payout
                      </button>
                    ) : (
                      <span className="badge badge-success" style={{ padding: '0.5rem 0.8rem' }}>
                        <CheckCircle2 className="w-4 h-4" /> Disbursed to Bank
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rotation Timeline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Rotation Timeline & Schedule Queue
        </h3>

        {isAdminUser && (
          <button 
            onClick={onOpenSwapModal}
            className="btn btn-sm btn-outline"
            style={{ fontSize: '0.8rem' }}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" /> Swap Turns
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {group.payoutSchedule.map((item) => {
          const member = group.members.find(m => m.id === item.memberId);
          if (!member) return null;

          const isCurrent = item.cycle === group.currentCycleIndex;
          const isDisbursed = item.status === 'Disbursed';

          return (
            <div 
              key={item.cycle}
              className="glass-card"
              style={{
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                borderLeft: isCurrent 
                  ? '4px solid var(--accent-gold)' 
                  : isDisbursed 
                  ? '4px solid var(--primary-light)' 
                  : '4px solid transparent'
              }}
            >
              {/* Left timeline info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: isDisbursed 
                    ? 'rgba(16, 185, 129, 0.2)' 
                    : isCurrent 
                    ? 'rgba(245, 158, 11, 0.2)' 
                    : 'var(--soft-bg)',
                  color: isDisbursed ? 'var(--primary-light)' : isCurrent ? 'var(--accent-gold)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  #{item.cycle}
                </div>

                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {member.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {member.bank} &bull; {member.phone}
                  </div>
                </div>
              </div>

              {/* Middle Date & Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar className="w-3.5 h-3.5" /> Turn Date:
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                    {formatDate(item.date)}
                  </div>
                </div>

                <div style={{ width: '130px', textAlign: 'right' }}>
                  <span className={`badge ${
                    isDisbursed ? 'badge-success' : isCurrent ? 'badge-warning' : 'badge-neutral'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div style={{ fontWeight: 700, color: 'var(--primary-light)', fontSize: '1rem', minWidth: '110px', textAlign: 'right' }}>
                  {formatNaira(item.amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
