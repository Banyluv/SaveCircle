import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/api';
import { formatNaira, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { Wallet, Calendar, Award, ShieldCheck, CheckCircle2, Clock, Landmark, Send, Users, Circle, CalendarCheck } from 'lucide-react';

// Personal dashboard for a regular member: shows their own contributions,
// their payout position, their group's account, a withdrawal panel, and
// a transparency view of fellow members' contribution status.
export default function MemberDashboard({ groups }) {
  const { user } = useAuth();
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [withdrawErr, setWithdrawErr] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [myProfile, setMyProfile] = useState(null);

  const group = groups[0]; // member only ever sees their own group

  // Load the member's own profile (for withdraw date / status / bank details)
  useEffect(() => {
    let mounted = true;
    authFetch('/api/auth/users')
      .then(r => r.json())
      .then(data => {
        if (mounted && Array.isArray(data)) {
          const me = data.find(u => u.id === user?.id) || data[0];
          if (me) setMyProfile(me);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [user?.id]);

  if (!group) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>You are not assigned to a group yet. Contact your group admin.</p>
      </div>
    );
  }

  const myMember = group.members?.find(m => m.id === myProfile?.memberId) || group.members?.[0];
  const myContributions = group.contributions || {};
  const mySchedule = group.payoutSchedule || [];

  // Withdrawal eligibility
  const withdrawDate = myProfile?.withdrawDate;
  const withdrawalStatus = myProfile?.withdrawalStatus || 'none';
  const withdrawalAmount = myProfile?.withdrawalAmount ?? myProfile?.contributionAmount;
  const isWithdrawDateReached = withdrawDate ? new Date() >= new Date(withdrawDate) : false;

  // Keeping fee = one contribution amount per member (what they contribute each
  // cycle — daily/weekly/monthly). The admin collects it at the end of the circle.
  const keepingFee = Number(myProfile?.contributionAmount ?? group.contributionAmount ?? 0);
  const grossWithdrawal = Number(withdrawalAmount ?? myProfile?.contributionAmount ?? 0);
  const netWithdrawal = Math.max(0, grossWithdrawal - keepingFee);

  const handleRequestWithdrawal = async () => {
    setWithdrawLoading(true);
    setWithdrawMsg('');
    setWithdrawErr('');
    try {
      const res = await authFetch('/api/auth/me/withdraw', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setWithdrawMsg('Withdrawal requested! Your group admin has been notified and will release it shortly.');
        setMyProfile(data);
      } else {
        setWithdrawErr(data.message || 'Could not request withdrawal');
      }
    } catch (e) {
      setWithdrawErr('Network error');
    }
    setWithdrawLoading(false);
  };

  // Totals
  let totalPaid = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  Object.values(myContributions).forEach(cycle => {
    (cycle || []).forEach(c => {
      if (c.status === 'Verified') { totalPaid += group.contributionAmount; paidCount++; }
      else if (c.status === 'Pending Verification') pendingCount++;
      else if (c.status === 'Overdue') overdueCount++;
    });
  });

  // My next payout
  const myNextPayout = mySchedule.find(s => s.status === 'Upcoming' || s.status === 'Current Target');
  const myPastPayouts = mySchedule.filter(s => s.status === 'Disbursed');
  const cycles = Object.keys(myContributions).sort((a, b) => Number(a) - Number(b));

  // --- Contribution Plan (tick card) ---
  // One unit = the amount the member accepted to contribute per day/week/month.
  // When the admin approves a transfer, its logged amount is divided by this
  // unit amount to work out how many units (days/weeks/months) get ticked.
  const frequency = group.frequency || 'Weekly';
  const freqLower = String(frequency).toLowerCase();
  const perUnitLabel = freqLower.includes('daily') ? 'Day'
    : freqLower.includes('month') ? 'Month'
    : freqLower.includes('bi') ? 'Fortnight'
    : 'Week';
  const perUnitAmount = Number(myProfile?.contributionAmount || group.contributionAmount) || 0;

  // Total money approved (Verified) by the admin, using the actual amount logged per transfer
  let totalVerifiedAmount = 0;
  Object.values(myContributions).forEach(cycle => {
    (cycle || []).forEach(c => {
      if (c.status === 'Verified') {
        totalVerifiedAmount += Number(c.amount) || group.contributionAmount || 0;
      }
    });
  });

  const tickedUnits = perUnitAmount > 0 ? Math.floor(totalVerifiedAmount / perUnitAmount) : 0;
  const partialRemainder = totalVerifiedAmount - (tickedUnits * perUnitAmount);
  const targetUnits = Math.max(Number(group.totalCycles) || 1, tickedUnits, 1);

  return (
    <div>
      {/* Welcome */}
      <div className="calabar-banner" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-success">My SaveCircle Account</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Welcome, {user?.name}
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Group: <strong style={{ color: 'var(--primary-light)' }}>{group.name}</strong>
            {' '}• {group.hubLocation}
          </p>
        </div>
      </div>

      {/* Personal stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Wallet className="w-4 h-4 text-emerald-400" /> Total Contributed
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>{formatNaira(totalPaid)}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Cycles Paid
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>{paidCount} / {cycles.length || 0}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock className="w-4 h-4 text-amber-400" /> Pending Verification
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>{pendingCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Award className="w-4 h-4 text-gold" /> My Position
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-gold)', marginTop: '0.5rem' }}>
            #{myMember?.position || '—'}
          </div>
        </div>
      </div>

      {/* My next payout highlight */}
      {myNextPayout && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                <span className="badge badge-warning"><Award className="w-3.5 h-3.5" /> My Upcoming Payout</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{formatNaira(myNextPayout.amount)}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Target date: {formatDate(myNextPayout.date)} • Turn #{myNextPayout.cycle}</div>
            </div>
          </div>
        </div>
      )}

      {/* My Contribution Plan — tick card (updates when the admin approves a transfer) */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarCheck className="w-5 h-5 text-emerald-400" /> My Contribution Plan
          </h3>
          <span className="badge badge-success">
            {tickedUnits} of {targetUnits} {perUnitLabel.toLowerCase()}s ticked
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'var(--success-bg)', border: '1px solid var(--border-card-accent)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>My Plan</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {formatNaira(perUnitAmount)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>per {perUnitLabel.toLowerCase()}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{frequency} frequency</div>
          </div>
          <div style={{ background: 'var(--success-bg)', border: '1px solid var(--border-card-accent)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Verified</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-light)' }}>{formatNaira(totalVerifiedAmount)}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {tickedUnits} {perUnitLabel.toLowerCase()}{tickedUnits === 1 ? '' : 's'} covered
              {partialRemainder > 0 && ` + ${formatNaira(partialRemainder)} partial`}
            </div>
          </div>
        </div>

        {/* Tick table: one slot per Day/Week/Month */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>{perUnitLabel}</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: targetUnits }, (_, i) => i + 1).map(n => {
                const isTicked = n <= tickedUnits;
                return (
                  <tr key={n} style={{ opacity: isTicked ? 1 : 0.65 }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{perUnitLabel} {n}</td>
                    <td>{formatNaira(perUnitAmount)}</td>
                    <td>
                      {isTicked ? (
                        <span className="badge badge-success"><CheckCircle2 className="w-3.5 h-3.5" /> Ticked</span>
                      ) : (
                        <span className="badge badge-neutral"><Circle className="w-3.5 h-3.5" /> Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group account + withdrawal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Group bank account — where members pay into */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Landmark className="w-4 h-4 text-emerald-400" /> Group Account <span style={{ fontSize: '0.72rem' }}>(pay your contributions here)</span>
          </div>
          {group.groupAccount?.accountNumber ? (
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace', letterSpacing: '0.03em' }}>
                {group.groupAccount.accountNumber}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>{group.groupAccount.accountName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{group.groupAccount.bankName}</div>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Contact your group admin for the group's bank account details.</p>
          )}
        </div>

        {/* Withdrawal panel */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-gold)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Send className="w-4 h-4 text-amber-400" /> My Withdrawal
          </div>
          {withdrawDate && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Withdrawal date: <strong style={{ color: 'var(--text-main)' }}>{formatDate(withdrawDate)}</strong>
              {!isWithdrawDateReached && <span style={{ color: 'var(--text-muted)' }}> • not yet reached</span>}
              {isWithdrawDateReached && <span className="badge badge-success" style={{ marginLeft: '0.4rem' }}>Date reached ✓</span>}
            </div>
          )}
          {withdrawalStatus === 'requested' && (
            <div>
              <span className="badge badge-warning">Withdrawal requested — awaiting admin release</span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Net to receive: <strong style={{ color: 'var(--primary-light)' }}>{formatNaira(myProfile?.withdrawalAmount ?? netWithdrawal)}</strong>
                {myProfile?.withdrawalFee ? <span> (after {formatNaira(myProfile.withdrawalFee)} keeping fee)</span> : null}
              </div>
            </div>
          )}
          {withdrawalStatus === 'paid' && (
            <div>
              <span className="badge badge-success">Withdrawal paid out ✓</span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                You received: <strong style={{ color: 'var(--primary-light)' }}>{formatNaira(myProfile?.withdrawalAmount ?? netWithdrawal)}</strong>
                {myProfile?.withdrawalFee ? <span> (after {formatNaira(myProfile.withdrawalFee)} keeping fee)</span> : null}
              </div>
            </div>
          )}
          {withdrawalStatus === 'none' && !withdrawDate && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Your group admin will set your withdrawal date. You can withdraw your contributions once it arrives.
            </p>
          )}
          {withdrawalStatus === 'none' && withdrawDate && isWithdrawDateReached && (
            <div style={{ marginTop: '0.5rem' }}>
              {/* Withdrawal breakdown: gross − keeping fee = net */}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.6rem' }}>
                <span>Your contributions: <strong style={{ color: 'var(--text-main)' }}>{formatNaira(grossWithdrawal)}</strong></span>
                <span>Keeping fee (1 cycle of your {myProfile?.contributionAmount ? `${formatNaira(myProfile.contributionAmount)}` : ''} contribution): <strong style={{ color: 'var(--danger-text)' }}>− {formatNaira(keepingFee)}</strong></span>
                <span style={{ borderTop: '1px solid var(--border-card)', paddingTop: '0.3rem' }}>
                  You'll receive: <strong style={{ color: 'var(--primary-light)', fontSize: '1rem' }}>{formatNaira(netWithdrawal)}</strong>
                </span>
              </div>
              <button
                onClick={handleRequestWithdrawal}
                disabled={withdrawLoading}
                className="btn btn-gold btn-sm"
              >
                <Send className="w-4 h-4" /> {withdrawLoading ? 'Requesting...' : `Request Withdrawal (${formatNaira(netWithdrawal)})`}
              </button>
            </div>
          )}
          {withdrawMsg && <p style={{ fontSize: '0.8rem', color: 'var(--primary-light)', marginTop: '0.5rem' }}>{withdrawMsg}</p>}
          {withdrawErr && <p style={{ fontSize: '0.8rem', color: 'var(--danger-text)', marginTop: '0.5rem' }}>{withdrawErr}</p>}
        </div>
      </div>

      {/* My contributions table */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck className="w-5 h-5 text-emerald-400" /> My Contributions
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Cycle</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Channel</th>
                <th>Reference</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map(cycle => {
                const contrib = (myContributions[cycle] || [])[0];
                return (
                  <tr key={cycle}>
                    <td>Cycle {cycle}</td>
                    <td>{formatNaira(Number(contrib?.amount) || group.contributionAmount)}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(contrib?.status)}`}>{contrib?.status || 'Not Paid'}</span>
                    </td>
                    <td>{contrib?.channel || '—'}</td>
                    <td>{contrib?.ref || '—'}</td>
                    <td>{contrib?.date ? formatDate(contrib.date) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group transparency: fellow members' contribution status (no bank details) */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users className="w-5 h-5 text-emerald-400" /> Group Activity
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          See that your group is active — everyone's contribution status for the current cycle.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Position</th>
                <th>Contribution</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(group.members || []).map(m => {
                const cycleContribs = group.contributions?.[group.currentCycleIndex] || [];
                const myContribution = cycleContribs.find(c => c.memberId === m.id);
                const status = m.id === myProfile?.memberId
                  ? (myContribution?.status || 'Not Paid')
                  : (myContribution?.status || 'Not Paid');
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {m.name}
                      {m.id === myProfile?.memberId && <span className="badge badge-success" style={{ marginLeft: '0.4rem' }}>You</span>}
                    </td>
                    <td>{m.role || 'Member'}</td>
                    <td>#{m.position || '—'}</td>
                    <td>{formatNaira(group.contributionAmount)}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(status)}`}>{status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* My payout history */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar className="w-5 h-5 text-amber-400" /> My Payout History
        </h3>
        {myPastPayouts.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>You have not received any payouts yet.</p>
        )}
        {myPastPayouts.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-card)' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatNaira(p.amount)}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Turn #{p.cycle} • {formatDate(p.date)}</div>
            </div>
            <span className="badge badge-success">Disbursed</span>
          </div>
        ))}
      </div>
    </div>
  );
}
