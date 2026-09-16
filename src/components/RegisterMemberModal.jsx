import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';
import { UserPlus, X, Wallet } from 'lucide-react';

export default function RegisterMemberModal({ onClose, groups }) {
  const { user } = useAuth(); // Has token
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [groupId, setGroupId] = useState(user?.role === 'admin' ? user.groupId : '');
  const [memberId, setMemberId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // For admins, the group is fixed to their own group.
  const isSuper = user?.role === 'superadmin';
  const targetGroups = isSuper ? groups : (groups || []).filter(g => g.id === user?.groupId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          groupId: role === 'superadmin' ? null : (groupId || user?.groupId || null),
          memberId: memberId || null,
          bankName: bankName || null,
          accountNumber: accountNumber || null,
          accountName: accountName || null,
          contributionAmount: contributionAmount ? Number(contributionAmount) : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Account created for ${data.name}! They can now log in.`);
        setName('');
        setEmail('');
        setPassword('');
        setMemberId('');
        setBankName('');
        setAccountNumber('');
        setAccountName('');
        setContributionAmount('');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error');
    }

    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus className="w-5 h-5 text-emerald-400" /> Add User Account
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Temporary Password</label>
            <input type="text" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="e.g. member123" />
          </div>

          {isSuper && (
            <div className="form-group">
              <label>Role</label>
              <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Group Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          )}

          {role !== 'superadmin' && targetGroups.length > 0 && (
            <div className="form-group">
              <label>Group</label>
              <select className="form-input" value={groupId || ''} onChange={(e) => setGroupId(e.target.value)} required={role === 'member'}>
                <option value="" disabled>Select group...</option>
                {targetGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {role === 'member' && (
            <div className="form-group">
              <label>Member ID (optional)</label>
              <input type="text" className="form-input" value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="e.g. m5" />
            </div>
          )}

          {role === 'member' && (
            <>
              <div style={{
                border: '1px solid var(--border-card-accent)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                background: 'var(--success-bg)'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-light)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Wallet className="w-4 h-4" /> Bank Details <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(for receiving your payouts)</span>
                </div>
                <div className="form-group">
                  <label>Bank Name</label>
                  <input type="text" className="form-input" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Zenith Bank" />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input type="text" className="form-input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g. 1234567890" />
                </div>
                <div className="form-group">
                  <label>Account Name</label>
                  <input type="text" className="form-input" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Effiong Bassey" />
                </div>
              </div>

              <div className="form-group">
                <label>Desired Contribution Amount (₦)</label>
                <input
                  type="number"
                  className="form-input"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  min="0"
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  The group admin can adjust this amount for the group's cycle.
                </p>
              </div>
            </>
          )}

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Share these credentials with the user so they can log in.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
