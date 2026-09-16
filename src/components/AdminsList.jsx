import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/api';
import { UserCog, ShieldCheck, Trash2, Pencil } from 'lucide-react';
import EditUserModal from './EditUserModal';
import MobileBackBar from './MobileBackBar';

// Superadmin-only: manage group admins. Assign an admin to a group, or promote a member.
export default function AdminsList({ groups, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);

  const load = () => {
    authFetch('/api/auth/users')
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const groupName = (gid) => groups.find(g => g.id === gid)?.name || gid || '—';

  const makeAdmin = async (id, groupId) => {
    try {
      await authFetch(`/api/auth/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', groupId })
      });
      load();
    } catch (e) {
      alert('Failed to update user');
    }
  };

  const makeMember = async (id) => {
    try {
      await authFetch(`/api/auth/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member' })
      });
      load();
    } catch (e) {
      alert('Failed to update user');
    }
  };

  const removeAdmin = async (id) => {
    if (!window.confirm('Remove this admin account?')) return;
    try {
      await authFetch(`/api/auth/users/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert('Failed to remove admin');
    }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading admins...</p>;

  const admins = users.filter(u => u.role === 'admin' || u.role === 'superadmin');
  const members = users.filter(u => u.role === 'member');

  return (
    <div>
      <MobileBackBar onBack={onBack} label="Back to Dashboard" title="Group Admins" />

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCog className="w-6 h-6 text-amber-400" /> Group Admins
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Assign or remove group admins. Each admin manages only their assigned group.
        </p>
      </div>

      {/* Existing admins */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Current Admins
        </h3>
        <table className="table" style={{ width: '100%' }}>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Group</th><th>Actions</th></tr></thead>
          <tbody>
            {admins.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</td>
                <td>{u.email}</td>
                <td><span className="badge badge-warning">{u.role === 'superadmin' ? 'Super Admin' : 'Group Admin'}</span></td>
                <td>{u.role === 'superadmin' ? 'All Groups' : groupName(u.groupId)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => setEditTarget(u)}
                      className="btn btn-outline btn-sm"
                      title={`Edit ${u.name}`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    {u.role === 'admin' && u.email !== 'superadmin@savecircle.com' && (
                      <button onClick={() => makeMember(u.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
                        Demote
                      </button>
                    )}
                    {u.role === 'admin' && u.email !== 'superadmin@savecircle.com' && (
                      <button onClick={() => removeAdmin(u.id)} title="Remove" style={{ background: 'none', border: 'none', color: 'var(--danger-text)', cursor: 'pointer' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Promote members */}
      {members.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Promote Member to Admin</h3>
          <table className="table" style={{ width: '100%' }}>
            <thead><tr><th>Name</th><th>Email</th><th>Group</th><th>Assign as Admin</th></tr></thead>
            <tbody>
              {members.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{groupName(u.groupId)}</td>
                  <td>
                    <select
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) makeAdmin(u.id, e.target.value); }}
                      style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--border-card)' }}
                    >
                      <option value="" disabled>Select group...</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTarget && (
        <EditUserModal
          target={editTarget}
          groups={groups || []}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
