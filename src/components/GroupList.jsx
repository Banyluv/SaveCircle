import React, { useState } from 'react';
import { formatNaira } from '../utils/formatters';
import { Search, MapPin, Users, Wallet, ArrowUpRight, Plus, ShieldCheck } from 'lucide-react';

export default function GroupList({ groups, onSelectGroup, onOpenCreateModal }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('ALL');

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.hubLocation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFreq = frequencyFilter === 'ALL' || g.frequency.toUpperCase() === frequencyFilter;
    return matchesSearch && matchesFreq;
  });

  return (
    <div>
      {/* Filters & Action Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Ajo Savings Groups
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Select a thrift pool to manage contributions, verify receipts, and view payout rotation.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 0.8rem'
          }}>
            <Search className="w-4 h-4 text-muted" />
            <input 
              type="text" 
              placeholder="Search group name, city, market..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', width: '210px' }}
            />
          </div>

          {/* Frequency Select */}
          <select 
            className="form-control"
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            style={{ width: '130px', padding: '0.5rem' }}
          >
            <option value="ALL">All Frequencies</option>
            <option value="WEEKLY">Weekly</option>
            <option value="BI-WEEKLY">Bi-Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>

          <button onClick={onOpenCreateModal} className="btn btn-gold btn-sm">
            <Plus className="w-4 h-4" /> New Pool
          </button>
        </div>
      </div>

      {/* Group Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '1.25rem'
      }}>
        {filteredGroups.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Wallet className="w-12 h-12 text-muted" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3>No Calabar Ajo groups found matching your search.</h3>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Try clearing filters or create a new group.</p>
          </div>
        ) : (
          filteredGroups.map(group => {
            const currentRecipientItem = group.payoutSchedule.find(s => s.cycle === group.currentCycleIndex);
            const recipientMember = group.members.find(m => m.id === currentRecipientItem?.memberId);

            // Calculate paid percentage for current cycle
            const cycleContribs = group.contributions?.[group.currentCycleIndex] || [];
            const verifiedCount = cycleContribs.filter(c => c.status === 'Verified').length;
            const progressPct = Math.round((verifiedCount / group.members.length) * 100);

            return (
              <div 
                key={group.id} 
                className="glass-card glass-card-interactive"
                onClick={() => onSelectGroup(group.id)}
                style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  {/* Top badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                      {group.frequency} Ajo
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {group.hubLocation}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    {group.name}
                  </h3>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '1rem' }}>
                    {group.description}
                  </p>

                  {/* Contribution & Recipient Box */}
                  <div style={{
                    background: '#0b1320',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem',
                    marginBottom: '1rem',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contribution</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                        {formatNaira(group.contributionAmount)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next Recipient</span>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-gold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {recipientMember ? recipientMember.name : 'Cycle Complete'}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                      <span>Cycle {group.currentCycleIndex} Collections</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{verifiedCount}/{group.members.length} Paid ({progressPct}%)</span>
                    </div>

                    <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%)',
                        borderRadius: '3px',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div style={{
                  marginTop: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem'
                }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Users className="w-3.5 h-3.5" /> {group.members.length} Members
                  </span>
                  <span style={{ color: 'var(--primary-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Manage Pool <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
