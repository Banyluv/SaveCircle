import React from 'react';
import { Plus, RotateCcw, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Top navigation bar: brand on the left, action icons on the right.
// Actions: Create SaveCircle Pool, Reset Demo (superadmin), theme toggle, logout.
export default function TopNav({ onOpenCreateModal, onResetDemoData }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuper = user?.role === 'superadmin';

  const iconBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface-hover)',
    border: '1px solid var(--border-card)',
    color: 'var(--text-main)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'all 0.15s ease'
  };

  return (
    <header style={{
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      padding: '0 1.5rem',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-card)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
        <div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            <strong>SaveCircle</strong>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {user?.name} • {user?.role === 'superadmin' ? 'Super Admin' : user?.role}
          </div>
        </div>
      </div>

      {/* Action icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isAdmin && (
          <button
            onClick={onOpenCreateModal}
            title="Create SaveCircle Pool"
            className="btn btn-gold btn-sm"
            style={{ height: '36px' }}
          >
            <Plus className="w-4 h-4" /> Create SaveCircle Pool
          </button>
        )}

        {isSuper && (
          <button
            onClick={onResetDemoData}
            title="Reset demo data"
            style={iconBtn}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={iconBtn}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={logout}
          title="Log out"
          style={{ ...iconBtn, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171' }}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
