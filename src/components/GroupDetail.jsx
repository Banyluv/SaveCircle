import React, { useState } from 'react';
import ContributionTracker from './ContributionTracker';
import PayoutQueue from './PayoutQueue';
import { formatNaira, getTrustScoreColor } from '../utils/formatters';
import { ArrowLeft, MapPin, Users, Calendar, ShieldCheck, Wallet, ArrowLeftRight, Settings } from 'lucide-react';

export default function GroupDetail({ group, onBack, onLogPayment, onVerifyPayment, onViewReceipt, onOpenSwapModal, onDisbursePayout }) {
  if (!group) return null;

  const [activeTab, setActiveTab] = useState('contributions');

  return (
    <div>
      {/* Back button & Header banner */}
      <button 
        onClick={onBack}
        className="btn btn-outline btn-sm"
        style={{ marginBottom: '1.25rem' }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Calabar Groups
      </button>

      <div className="calabar-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-success">Calabar Ajo Pool</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin className="w-3.5 h-3.5" /> {group.hubLocation}
            </span>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {group.name}
          </h1>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.2rem', maxWidth: '700px' }}>
            {group.description}
          </p>
        </div>

        {/* Quick summary box */}
        <div style={{
          background: 'rgba(11, 19, 32, 0.7)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-card)',
          textAlign: 'right'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contribution Rule</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-light)' }}>
            {formatNaira(group.contributionAmount)}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
            {group.frequency} &bull; {group.members.length} Members
          </span>
        </div>
      </div>

      {/* Tabs list */}
      <div className="tab-list">
        <button 
          onClick={() => setActiveTab('contributions')}
          className={`tab-item ${activeTab === 'contributions' ? 'active' : ''}`}
        >
          <Wallet className="w-4 h-4" /> Contributions Matrix
        </button>

        <button 
          onClick={() => setActiveTab('payouts')}
          className={`tab-item ${activeTab === 'payouts' ? 'active' : ''}`}
        >
          <ArrowLeftRight className="w-4 h-4" /> Payout Queue & Rotation
        </button>

        <button 
          onClick={() => setActiveTab('members')}
          className={`tab-item ${activeTab === 'members' ? 'active' : ''}`}
        >
          <Users className="w-4 h-4" /> Members Roster ({group.members.length})
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
        >
          <Settings className="w-4 h-4" /> Group Info & Rules
        </button>
      </div>

      {/* Tab Content */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {activeTab === 'contributions' && (
          <ContributionTracker 
            group={group}
            onLogPayment={() => onLogPayment(group)}
            onVerifyPayment={(memberId) => onVerifyPayment(group.id, memberId)}
            onViewReceipt={onViewReceipt}
          />
        )}

        {activeTab === 'payouts' && (
          <PayoutQueue 
            group={group}
            onOpenSwapModal={() => onOpenSwapModal(group)}
            onDisbursePayout={onDisbursePayout}
          />
        )}

        {activeTab === 'members' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
              Calabar Member Roster & Trust Ratings
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {group.members.map(m => (
                <div key={m.id} style={{
                  background: '#0b1320',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem', marginBottom: '0.3rem' }}>
                        Turn #{m.position}
                      </span>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{m.name}</h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.role}</p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trust Rating:</span>
                      <div className={getTrustScoreColor(m.trustScore)} style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                        {m.trustScore}%
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.8rem' }}>
                    <div>Phone: <span style={{ color: 'var(--text-main)' }}>{m.phone}</span></div>
                    <div>Bank: <span style={{ color: 'var(--accent-gold)' }}>{m.bank}</span> ({m.accountNumber})</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
                Group Configuration
              </h3>
              <ul style={{ listStyle: 'none', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li>Location: <strong style={{ color: 'var(--text-main)' }}>{group.hubLocation}</strong></li>
                <li>Contribution: <strong style={{ color: 'var(--primary-light)' }}>{formatNaira(group.contributionAmount)}</strong></li>
                <li>Frequency: <strong style={{ color: 'var(--text-main)' }}>{group.frequency}</strong></li>
                <li>Late Penalty Fee: <strong style={{ color: 'var(--danger)' }}>{formatNaira(group.penaltyFee)}</strong></li>
                <li>Total Pool Pot per Cycle: <strong style={{ color: 'var(--accent-gold)' }}>{formatNaira(group.contributionAmount * group.members.length)}</strong></li>
              </ul>
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
                Trustee / Leadership Contact
              </h3>
              <div style={{ background: '#0b1320', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)' }}>
                <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>{group.trustee} (Iya Ajo / Trustee)</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Contact: {group.trusteeContact}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--primary-light)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Responsible for verifying bank transfer session IDs, holding cash at market stand, and executing payout disbursal.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
