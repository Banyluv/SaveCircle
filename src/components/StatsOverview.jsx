import React from 'react';
import { formatNaira } from '../utils/formatters';
import { Wallet, Users, Award, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';

export default function StatsOverview({ groups }) {
  // Calculate total money collected across all verified contributions
  let totalCollected = 0;
  let totalMembers = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  groups.forEach(g => {
    totalMembers += g.members.length;
    
    // Sum verified contributions
    Object.values(g.contributions || {}).forEach(cycleContribs => {
      cycleContribs.forEach(c => {
        if (c.status === 'Verified') {
          totalCollected += g.contributionAmount;
        } else if (c.status === 'Pending Verification') {
          pendingCount++;
        } else if (c.status === 'Overdue') {
          overdueCount++;
        }
      });
    });
  });

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '1.25rem',
      marginBottom: '2rem'
    }}>
      {/* Metric 1: Total Savings Pool */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Thrift Collected</span>
          <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 135, 81, 0.15)', color: 'var(--primary-light)' }}>
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
          {formatNaira(totalCollected)}
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.4rem' }}>
          <TrendingUp className="w-3.5 h-3.5" /> Live total across {groups.length} Calabar pools
        </p>
      </div>

      {/* Metric 2: Active Calabar Pools & Members */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Groups & Members</span>
          <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Users className="w-5 h-5" />
          </div>
        </div>
        <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
          {groups.length} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>Groups</span>
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          {totalMembers} registered market traders & members
        </p>
      </div>

      {/* Metric 3: Pending Payments */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Verification</span>
          <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-gold)' }}>
            <Calendar className="w-5 h-5" />
          </div>
        </div>
        <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
          {pendingCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>payments</span>
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--accent-gold)', marginTop: '0.4rem' }}>
          Requires Trustee / Iya Ajo verification
        </p>
      </div>

      {/* Metric 4: Overdue Alerts */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Overdue Payments</span>
          <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: overdueCount > 0 ? '#ef4444' : 'var(--text-main)' }}>
          {overdueCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>members</span>
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '0.4rem' }}>
          {overdueCount > 0 ? 'Reminders queued' : 'All accounts up to date'}
        </p>
      </div>
    </div>
  );
}
