import React, { useState } from 'react';
import { ArrowLeftRight, X, AlertCircle } from 'lucide-react';

export default function SwapPositionModal({ group, onClose, onSwapSubmit }) {
  if (!group) return null;

  const [member1Id, setMember1Id] = useState(group.members[0]?.id || '');
  const [member2Id, setMember2Id] = useState(group.members[1]?.id || '');
  const [reason, setReason] = useState('Urgent fabric restocking ahead of Calabar Carnival');

  const m1 = group.members.find(m => m.id === member1Id);
  const m2 = group.members.find(m => m.id === member2Id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!member1Id || !member2Id || member1Id === member2Id) return;

    onSwapSubmit({
      groupId: group.id,
      member1Id,
      member2Id,
      reason
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Swap Payout Rotation Turn
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {group.name}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Swap visualizer */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '0.75rem',
            background: '#0b1320',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
            border: '1px solid var(--border-card)'
          }}>
            {/* Member 1 */}
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initiating Member:</span>
              <select 
                className="form-control" 
                style={{ marginTop: '0.2rem', fontSize: '0.85rem' }}
                value={member1Id}
                onChange={(e) => setMember1Id(e.target.value)}
              >
                {group.members.map(m => (
                  <option key={m.id} value={m.id}>
                    Turn #{m.position}: {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Icon */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.2)',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '1.2rem'
            }}>
              <ArrowLeftRight className="w-4 h-4" />
            </div>

            {/* Member 2 */}
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Swap With Member:</span>
              <select 
                className="form-control"
                style={{ marginTop: '0.2rem', fontSize: '0.85rem' }}
                value={member2Id}
                onChange={(e) => setMember2Id(e.target.value)}
              >
                {group.members.map(m => (
                  <option key={m.id} value={m.id} disabled={m.id === member1Id}>
                    Turn #{m.position}: {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {m1 && m2 && member1Id === member2Id && (
            <p style={{ color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle className="w-4 h-4" /> Please select two different members to swap turns.
            </p>
          )}

          {/* Reason */}
          <div className="form-group">
            <label>Reason for Swap Agreement:</label>
            <textarea 
              className="form-control"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain emergency or mutual agreement between traders..."
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-gold"
              disabled={member1Id === member2Id}
            >
              Confirm Position Swap
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
