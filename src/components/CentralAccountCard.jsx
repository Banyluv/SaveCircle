import React, { useEffect, useState } from 'react';
import { Landmark, Info } from 'lucide-react';
import { settingsAPI } from '../utils/api';

// Read-only card showing the platform's central account — the account every
// group's contributions are paid into. Rendered wherever a member needs to know
// where to send money. Renders nothing until a superadmin activates the account,
// so members are never shown a placeholder account number.
export default function CentralAccountCard({ compact = false }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    settingsAPI.getCentralAccount()
      .then((res) => { if (!cancelled) setAccount(res?.data || null); })
      .catch(() => { if (!cancelled) setAccount(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;
  // Nothing to show until the platform actually has a central account.
  if (!account || !account.active || !account.accountNumber) return null;

  const rows = [
    ['Account Number', account.accountNumber, true],
    ['Account Name', account.accountName, false],
    ['Bank', account.bankName, false]
  ];

  if (compact) {
    return (
      <div style={{
        background: 'var(--success-bg)', border: '1px solid var(--success-border)',
        borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem'
      }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
          <Landmark className="w-4 h-4" /> Central Account (pay contributions here)
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
          {account.accountNumber}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {account.accountName}{account.bankName ? ` • ${account.bankName}` : ''}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
        <Landmark className="w-4 h-4 text-emerald-400" />
        Central Account <span style={{ fontSize: '0.72rem' }}>(all contributions are paid here)</span>
      </div>

      {rows.filter(r => r[1]).map(([label, value, mono]) => (
        <div key={label} style={{ marginBottom: '0.35rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
          <div style={{
            fontSize: mono ? '1.1rem' : '0.88rem',
            fontWeight: mono ? 800 : 600,
            color: 'var(--text-main)',
            fontFamily: mono ? 'monospace' : 'inherit',
            letterSpacing: mono ? '0.03em' : 'normal'
          }}>
            {value}
          </div>
        </div>
      ))}

      {account.note && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <Info className="w-3.5 h-3.5" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{account.note}</span>
        </div>
      )}
    </div>
  );
}
