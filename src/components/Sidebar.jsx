import React from 'react';
import { Wallet, LayoutDashboard, Users, History, UserCog, PieChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeNav, setActiveNav }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'groups', label: user?.role === 'member' ? 'My Group' : 'SaveCircle Groups', icon: Wallet },
    { id: 'contributions', label: 'Contributions', icon: PieChart },
    ...(isAdmin ? [{ id: 'members', label: 'Members', icon: Users }] : []),
    ...(user?.role === 'superadmin' ? [{ id: 'admins', label: 'Admins', icon: UserCog }] : []),
    { id: 'audit', label: 'Audit History', icon: History }
  ];

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-card)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Brand */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'center' }}>
        <img
          src="/logo.png"
          alt="SaveCircle Logo"
          style={{
            width: '100%',
            maxWidth: '120px',
            height: 'auto',
            borderRadius: 'var(--radius-sm)',
            objectFit: 'contain',
            boxShadow: 'var(--shadow-glow)'
          }}
        />
      </div>

      {/* User card */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent-gold))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem', fontWeight: 700, color: '#fff'
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', textTransform: 'capitalize' }}>
              {user?.role === 'superadmin' ? 'Super Admin' : user?.role}
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.7rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: active ? 'rgba(0, 135, 81, 0.18)' : 'transparent',
                color: active ? 'var(--primary-light)' : 'var(--text-muted)',
                fontSize: '0.9rem',
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {active && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-light)' }} />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
