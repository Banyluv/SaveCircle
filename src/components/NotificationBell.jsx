import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, CheckCircle2, XCircle, HandCoins, FileText, BellRing } from 'lucide-react';
import { notificationAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

// Nav ids that notifications are allowed to jump to.
const NAV_SEGMENTS = new Set([
  'dashboard', 'groups', 'contributions', 'loans', 'members', 'admins', 'audit'
]);

// Map notification type → icon + color for the dropdown list.
const typeMeta = (type) => {
  switch (type) {
    case 'loan_approved': return { icon: CheckCircle2, color: 'var(--success)' };
    case 'loan_rejected': return { icon: XCircle, color: 'var(--danger)' };
    case 'loan_applied': return { icon: FileText, color: 'var(--accent-gold)' };
    case 'repayment_submitted': return { icon: HandCoins, color: 'var(--accent-gold)' };
    case 'repayment_verified': return { icon: CheckCircle2, color: 'var(--success)' };
    default: return { icon: Bell, color: 'var(--primary)' };
  }
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// Notification bell with dropdown. Polls the unread count & list periodically.
export default function NotificationBell({ onNavigate }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const load = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const d = await notificationAPI.getAll();
      setItems(d.data?.notifications || []);
      setUnread(d.data?.unread_count || 0);
    } catch (e) {
      // ignore transient errors
    } finally {
      setLoading(false);
    }
  };

  const loadCount = async () => {
    if (!user) return;
    try {
      const d = await notificationAPI.unreadCount();
      setUnread(d.data?.unread_count || 0);
    } catch (e) {
      // ignore
    }
  };

  // Load on mount & whenever the user changes
  useEffect(() => {
    if (user) load();
    else { setItems([]); setUnread(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Poll unread count every 20s so the badge stays fresh
  useEffect(() => {
    if (!user) return;
    const id = setInterval(loadCount, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      // ignore
    }
  };

  // Notifications store a link such as '/loans', while the app navigates by nav
  // id ('loans'). Resolve it here so clicking a notification actually moves the
  // user to the relevant module instead of doing nothing.
  const navTargetFor = (n) => {
    const link = n?.link || '';
    const match = String(link).match(/^\/([a-z0-9-]+)/i);
    if (match) {
      const segment = match[1].toLowerCase();
      if (NAV_SEGMENTS.has(segment)) return segment;
    }
    // Fall back to the notification type.
    if (n?.type === 'loan_applied' || n?.type === 'repayment_submitted') return 'loans';
    if (n?.type?.startsWith('loan_') || n?.type === 'repayment_verified') return 'loans';
    return null;
  };

  const handleItemClick = async (n) => {
    if (!n.is_read) {
      try {
        await notificationAPI.markOneRead(n.id);
        setUnread((u) => Math.max(0, u - 1));
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      } catch (e) {
        // ignore
      }
    }
    setOpen(false);
    const target = navTargetFor(n);
    if (onNavigate && target) onNavigate(target);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        title="Notifications"
        aria-label="Notifications"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-surface-hover)',
          border: '1px solid var(--border-card)',
          color: 'var(--text-main)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.15s ease'
        }}
      >
        {unread > 0 ? <BellRing className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} /> : <Bell className="w-4 h-4" />}
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            minWidth: '17px',
            height: '17px',
            padding: '0 4px',
            borderRadius: '9999px',
            background: 'var(--danger)',
            color: '#fff',
            fontSize: '0.62rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-surface)'
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '360px',
          maxWidth: '90vw',
          maxHeight: '480px',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 'var(--z-popover)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--border-card)'
          }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Notifications</strong>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          {loading && items.length === 0 ? (
            <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading…</p>
          ) : items.length === 0 ? (
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              <Bell className="w-8 h-8" style={{ margin: '0 auto 0.6rem', color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notifications yet.</p>
            </div>
          ) : (
            items.map((n) => {
              const meta = typeMeta(n.type);
              const Icon = meta.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    display: 'flex',
                    gap: '0.7rem',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    background: n.is_read ? 'transparent' : 'var(--success-bg)',
                    border: 'none',
                    borderBottom: '1px solid var(--border-card)',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--success-bg)'; }}
                >
                  <span style={{
                    width: '32px', height: '32px', minWidth: '32px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)', flex: 1 }}>{n.title}</strong>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</span>
                    </span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.35 }}>{n.message}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
