import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatNaira, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { CheckCircle2, Clock, AlertTriangle, FileText, Plus, ShieldCheck, Filter } from 'lucide-react';

export default function ContributionTracker({ group, onLogPayment, onVerifyPayment, onViewReceipt }) {
  const { user } = useAuth();
  const isAdminUser = ['admin', 'superadmin', 'trustee'].includes(user?.role);
  if (!group) return null;

  const [filterStatus, setFilterStatus] = useState('ALL');

  const currentCycleIndex = group.currentCycleIndex;
  const cycleContribs = group.contributions?.[currentCycleIndex] || [];

  // Map member payment status
  const memberRows = group.members.map(member => {
    const record = cycleContribs.find(c => c.memberId === member.id);
    return {
      member,
      record: record || { status: 'Overdue', date: null, channel: null, ref: null }
    };
  });

  const filteredRows = memberRows.filter(row => {
    if (filterStatus === 'ALL') return true;
    return row.record.status.toUpperCase().includes(filterStatus);
  });

  return (
    <div>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Cycle {currentCycleIndex} Member Contributions
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Target per member: <strong style={{ color: 'var(--primary-light)' }}>{formatNaira(group.contributionAmount)}</strong> &bull; Frequency: {group.frequency}
          </p>
        </div>

        {/* Filter controls & Action button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-surface)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-card)' }}>
            <Filter className="w-3.5 h-3.5 text-muted" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="PENDING">Pending Only</option>
              <option value="OVERDUE">Overdue Only</option>
            </select>
          </div>

          {isAdminUser && (
            <button onClick={onLogPayment} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Log Member Payment
            </button>
          )}
        </div>
      </div>

      {/* Member Matrix Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Member & Role</th>
              <th style={{ padding: '0.75rem 1rem' }}>Calabar Bank Info</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem' }}>Channel & Ref</th>
              <th style={{ padding: '0.75rem 1rem' }}>Date</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No members match the selected status filter.
                </td>
              </tr>
            ) : (
              filteredRows.map(({ member, record }) => {
                const badgeClass = getStatusBadgeClass(record.status);
                const isVerified = record.status === 'Verified';
                const isPending = record.status === 'Pending Verification';

                return (
                  <tr 
                    key={member.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                  >
                    {/* Member */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{member.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.role} &bull; {member.phone}</div>
                    </td>

                    {/* Bank Info */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
                      <div style={{ color: 'var(--accent-gold)', fontWeight: 500 }}>{member.bank}</div>
                      <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{member.accountNumber}</div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`badge ${badgeClass}`}>
                        {record.status}
                      </span>
                    </td>

                    {/* Channel & Ref */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
                      {record.channel ? (
                        <>
                          <div style={{ color: 'var(--text-main)' }}>{record.channel}</div>
                          <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {record.ref}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Unpaid</span>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {record.date ? formatDate(record.date) : '-'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {isPending && isAdminUser && (
                          <button 
                            onClick={() => onVerifyPayment(member.id)}
                            className="btn btn-sm btn-primary"
                            title="Verify Trustee Confirmation"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Verify
                          </button>
                        )}

                        {isVerified && (
                          <button 
                            onClick={() => onViewReceipt({
                              groupName: group.name,
                              hubLocation: group.hubLocation,
                              amount: group.contributionAmount,
                              memberName: member.name,
                              date: record.date,
                              channel: record.channel,
                              ref: record.ref,
                              cycleIndex: currentCycleIndex,
                              trustee: group.trustee,
                              proofNote: record.proofNote
                            })}
                            className="btn btn-sm btn-outline"
                            title="View Calabar Receipt"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" /> Receipt
                          </button>
                        )}

                        {record.status === 'Overdue' && isAdminUser && (
                          <button 
                            onClick={onLogPayment}
                            className="btn btn-sm btn-gold"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
