import React, { useState } from 'react';
import { History, ShieldCheck, Banknote, ArrowLeftRight, Filter, Clock } from 'lucide-react';

export default function AuditLog({ logs }) {
  const [filterAction, setFilterAction] = useState('ALL');

  const filteredLogs = logs.filter(log => {
    if (filterAction === 'ALL') return true;
    return log.action.toUpperCase().includes(filterAction);
  });

  const getActionBadge = (action) => {
    switch (action?.toLowerCase()) {
      case 'verify contribution':
        return <span className="badge badge-success"><ShieldCheck className="w-3 h-3" /> Verified</span>;
      case 'payout disbursed':
        return <span className="badge badge-warning"><Banknote className="w-3 h-3" /> Disbursed</span>;
      case 'swap request':
        return <span className="badge badge-neutral"><ArrowLeftRight className="w-3 h-3" /> Swap</span>;
      default:
        return <span className="badge badge-neutral">{action}</span>;
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History className="w-6 h-6 text-emerald-400" /> Calabar Audit Log & Activity Trail
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Immutable history of contributions, trustee approvals, turn swaps, and bank payout disbursals.
          </p>
        </div>

        {/* Action Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-surface)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)' }}>
          <Filter className="w-3.5 h-3.5 text-muted" />
          <select 
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value="ALL">All Actions</option>
            <option value="VERIFY">Verifications</option>
            <option value="PAYOUT">Payout Disbursals</option>
            <option value="SWAP">Turn Swaps</option>
            <option value="PAYMENT">Log Payments</option>
          </select>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {filteredLogs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
            No audit log entries match the selected filter.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredLogs.map(log => (
              <div 
                key={log.id}
                style={{
                  padding: '1rem 1.2rem',
                  background: '#0b1320',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                    {getActionBadge(log.action)}
                    <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      {log.groupName}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {log.detail}
                  </p>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock className="w-3 h-3" /> {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(log.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
