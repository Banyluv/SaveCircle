import React from 'react';
import { useAuth } from '../context/AuthContext';
import StatsOverview from './StatsOverview';
import GroupList from './GroupList';
import { formatNaira, formatDate } from '../utils/formatters';
import { MapPin, Award, ArrowUpRight, ShieldCheck, History, Plus, UserPlus } from 'lucide-react';

export default function Dashboard({ groups, onSelectGroup, onOpenCreateModal, onOpenRegisterModal, logs, onViewReceipt }) {
  const { user } = useAuth();
  // Find urgent upcoming payout across all active groups
  let nextPayoutInfo = null;
  groups.forEach(g => {
    const currentItem = g.payoutSchedule.find(s => s.cycle === g.currentCycleIndex);
    if (currentItem) {
      const recipient = g.members.find(m => m.id === currentItem.memberId);
      if (recipient && (!nextPayoutInfo || new Date(currentItem.date) < new Date(nextPayoutInfo.item.date))) {
        nextPayoutInfo = {
          group: g,
          item: currentItem,
          recipient
        };
      }
    }
  });

  return (
    <div>
      {/* Pan-Nigerian Welcome Banner */}
      <div className="calabar-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-success">Nigerian Thrift Ecosystem 🇳🇬</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <MapPin className="w-3.5 h-3.5" /> Calabar &bull; Lagos &bull; Abuja &bull; Aba &bull; Nationwide
            </span>
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            SaveCircle Group Savings
          </h1>

          {user && (
            <p style={{ fontSize: '1rem', color: 'var(--text-main)', marginTop: '0.75rem', maxWidth: '720px', fontWeight: 600 }}>
              Welcome back, {user.name}! {['admin', 'superadmin', 'trustee'].includes(user.role) ? 'Manage your groups, verify contributions, and add members.' : 'You are logged in as a member — check your groups, contributions, and upcoming payouts.'}
            </p>
          )}

          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.8rem', maxWidth: '720px' }}>
            Digitizing traditional rotating thrift pools for market traders, shopkeepers, cooperatives, and enterprise guilds across Nigeria.
          </p>
        </div>

        {['admin', 'superadmin', 'trustee'].includes(user?.role) && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={onOpenRegisterModal} className="btn btn-outline" style={{ background: 'var(--bg-surface)' }}>
              <UserPlus className="w-4 h-4" /> Add Member Login
            </button>
            <button onClick={onOpenCreateModal} className="btn btn-gold">
              <Plus className="w-4 h-4" /> Start New SaveCircle Pool
            </button>
          </div>
        )}
      </div>

      {/* Top Level Metric Stats */}
      <StatsOverview groups={groups} />

      {/* Next Upcoming Payout Recipient Highlight */}
      {nextPayoutInfo && (
        <div className="glass-card" style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          borderLeft: '4px solid var(--accent-gold)',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="badge badge-warning">
                  <Award className="w-3.5 h-3.5" /> Next Scheduled SaveCircle Payout
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {nextPayoutInfo.group.name} &bull; {nextPayoutInfo.group.hubLocation}
                </span>
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {nextPayoutInfo.recipient.name}
              </h2>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Turn #{nextPayoutInfo.recipient.position} &bull; Bank: <strong style={{ color: 'var(--accent-gold)' }}>{nextPayoutInfo.recipient.bank}</strong> ({nextPayoutInfo.recipient.accountNumber})
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Payout</span>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                {formatNaira(nextPayoutInfo.item.amount)}
              </h1>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Target Date: {formatDate(nextPayoutInfo.item.date)}
              </span>

              <div style={{ marginTop: '0.5rem' }}>
                <button 
                  onClick={() => onSelectGroup(nextPayoutInfo.group.id)}
                  className="btn btn-sm btn-outline"
                >
                  Manage Group <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups Section */}
      <GroupList 
        groups={groups} 
        onSelectGroup={onSelectGroup} 
        onOpenCreateModal={onOpenCreateModal} 
      />
    </div>
  );
}
