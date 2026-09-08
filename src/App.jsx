import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Dashboard from './components/Dashboard';
import GroupList from './components/GroupList';
import GroupDetail from './components/GroupDetail';
import CreateGroupModal from './components/CreateGroupModal';
import LogPaymentModal from './components/LogPaymentModal';
import ReceiptModal from './components/ReceiptModal';
import SwapPositionModal from './components/SwapPositionModal';
import AuditLog from './components/AuditLog';
import Toast from './components/Toast';
import Login from './components/Login';
import RegisterMemberModal from './components/RegisterMemberModal';
import MemberDashboard from './components/MemberDashboard';
import MembersList from './components/MembersList';
import AdminsList from './components/AdminsList';
import AiChat from './components/AiChat';
import LoansArea from './components/Loans/LoansArea';
import { useAuth } from './context/AuthContext';

import { initialCalabarGroups, initialAuditLogs } from './data/initialData';
import { API_BASE_URL, authFetch } from './utils/api';

export default function App() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [activeNav, setActiveNav] = useState('dashboard'); // 'dashboard', 'groups', 'contributions', 'members', 'admins', 'audit', 'group-detail'
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [logPaymentGroup, setLogPaymentGroup] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [swapGroup, setSwapGroup] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const isMember = user?.role === 'member';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  // Loan-only borrowers (individuals / cooperatives) — no thrift groups
  const isLoanBorrower = user?.role === 'individual' || user?.role === 'cooperative';

  // Reset navigation whenever the signed-in user changes (login/logout)
  useEffect(() => {
    setActiveNav(isLoanBorrower ? 'loans' : 'dashboard');
    setSelectedGroupId(null);
  }, [user?.id]);

  // Fetch initial data from Backend (role-scoped by the API).
  // Triggered by user.id so it runs once per login and after a page reload.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsInitialLoad(true);
    Promise.all([
      authFetch('/api/groups').then(res => res.json()),
      authFetch('/api/logs').then(res => res.json())
    ])
    .then(([fetchedGroups, fetchedLogs]) => {
      if (cancelled) return;
      if (Array.isArray(fetchedGroups) && fetchedGroups.length > 0) {
        setGroups(fetchedGroups);
        setLogs(Array.isArray(fetchedLogs) ? fetchedLogs : []);
      } else {
        // First run: seed db with demo data (superadmin-only bootstrap)
        setGroups(initialCalabarGroups);
        setLogs(initialAuditLogs);
        fetch(`${API_BASE_URL}/api/groups/sync`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(initialCalabarGroups)
        });
        fetch(`${API_BASE_URL}/api/logs/sync`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(initialAuditLogs)
        });
      }
      setIsInitialLoad(false);
    })
    .catch(() => {
      if (cancelled) return;
      setIsInitialLoad(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Sync state to Backend on change (admins/superadmin only — members don't modify group data)
  useEffect(() => {
    if (isInitialLoad || !isAdmin) return;
    fetch(`${API_BASE_URL}/api/groups/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groups)
    }).catch(console.error);
  }, [groups, isInitialLoad, isAdmin]);

  useEffect(() => {
    if (isInitialLoad || !isAdmin) return;
    fetch(`${API_BASE_URL}/api/logs/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logs)
    }).catch(console.error);
  }, [logs, isInitialLoad, isAdmin]);

  // Log action helper
  const addAuditLog = (groupName, action, detail) => {
    const newEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      groupName,
      action,
      detail
    };
    setLogs(prev => [newEntry, ...prev]);
  };

  // Reset demo data
  const handleResetDemoData = () => {
    if (window.confirm('Reset all SaveCircle groups to original demo state and wipe database?')) {
      setGroups(initialCalabarGroups);
      setLogs(initialAuditLogs);
      fetch(`${API_BASE_URL}/api/groups/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(initialCalabarGroups)
      });
      fetch(`${API_BASE_URL}/api/logs/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(initialAuditLogs)
      });
      showToast('Restored default demo data successfully!', 'info');
    }
  };

  // Create new group
  const handleCreateGroup = (newGroup) => {
    setGroups(prev => [newGroup, ...prev]);
    addAuditLog(newGroup.name, 'Create Group', `Created new SaveCircle group in ${newGroup.hubLocation} with ${newGroup.members.length} members.`);
    showToast(`Created ${newGroup.name} successfully!`);
  };

  // Log Payment submit
  const handleSubmitPayment = ({ groupId, cycleIndex, memberId, channel, ref, proofNote, status, amount }) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;

      const member = g.members.find(m => m.id === memberId);
      const memberName = member ? member.name : 'Member';
      const paidAmount = Number(amount) || g.contributionAmount;

      const currentCycleContribs = g.contributions[cycleIndex] || [];
      // Remove existing record for this member if any
      const updatedContribs = currentCycleContribs.filter(c => c.memberId !== memberId);

      const newRecord = {
        memberId,
        status: status || 'Verified',
        date: new Date().toISOString().split('T')[0],
        channel,
        ref,
        proofNote,
        amount: paidAmount
      };

      updatedContribs.push(newRecord);

      addAuditLog(g.name, status === 'Verified' ? 'Verify Contribution' : 'Log Payment', `${memberName} logged payment of ₦${paidAmount.toLocaleString()} via ${channel} (${ref}).`);

      return {
        ...g,
        contributions: {
          ...g.contributions,
          [cycleIndex]: updatedContribs
        }
      };
    }));

    showToast('Logged contribution payment successfully!');
  };

  // Trustee Confirm Verification
  const handleVerifyPayment = (groupId, memberId) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;

      const member = g.members.find(m => m.id === memberId);
      const cycleContribs = g.contributions[g.currentCycleIndex] || [];

      const updatedContribs = cycleContribs.map(c => {
        if (c.memberId === memberId) {
          return { ...c, status: 'Verified', date: new Date().toISOString().split('T')[0] };
        }
        return c;
      });

      addAuditLog(g.name, 'Verify Contribution', `Trustee verified payment for ${member?.name}.`);
      return {
        ...g,
        contributions: {
          ...g.contributions,
          [g.currentCycleIndex]: updatedContribs
        }
      };
    }));

    showToast('Contribution status set to Verified!');
  };

  // Swap turns
  const handleSwapSubmit = ({ groupId, member1Id, member2Id, reason }) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;

      const m1 = g.members.find(m => m.id === member1Id);
      const m2 = g.members.find(m => m.id === member2Id);
      if (!m1 || !m2) return g;

      // Swap positions
      const pos1 = m1.position;
      const pos2 = m2.position;

      const updatedMembers = g.members.map(m => {
        if (m.id === member1Id) return { ...m, position: pos2 };
        if (m.id === member2Id) return { ...m, position: pos1 };
        return m;
      }).sort((a, b) => a.position - b.position);

      // Re-assign payout schedule recipients based on position
      const updatedSchedule = g.payoutSchedule.map(item => {
        const matchingMember = updatedMembers.find(m => m.position === item.cycle);
        return {
          ...item,
          memberId: matchingMember ? matchingMember.id : item.memberId
        };
      });

      addAuditLog(g.name, 'Swap Request', `Swapped turn #${pos1} (${m1.name}) with turn #${pos2} (${m2.name}). Reason: ${reason}`);

      return {
        ...g,
        members: updatedMembers,
        payoutSchedule: updatedSchedule
      };
    }));

    showToast('Payout rotation positions swapped!');
  };

  // Disburse Payout
  const handleDisbursePayout = (groupId, cycleIndex) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;

      const currentScheduleItem = g.payoutSchedule.find(s => s.cycle === cycleIndex);
      const recipient = g.members.find(m => m.id === currentScheduleItem?.memberId);

      const updatedSchedule = g.payoutSchedule.map(s => {
        if (s.cycle === cycleIndex) {
          return {
            ...s,
            status: 'Disbursed',
            ref: `PAY-CALABAR-${Date.now()}`
          };
        }
        return s;
      });

      addAuditLog(g.name, 'Payout Disbursed', `Disbursed ₦${currentScheduleItem?.amount.toLocaleString()} lump sum to ${recipient?.name} (${recipient?.bank}).`);

      return {
        ...g,
        payoutSchedule: updatedSchedule
      };
    }));

    showToast('Lump-sum payout disbursed successfully!');
  };

  // Select Group
  const handleSelectGroup = (id) => {
    setSelectedGroupId(id);
    setActiveNav('group-detail');
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  if (!user) {
    return (
      <>
        <Login />
        <AiChat groups={[]} />
      </>
    );
  }

  const handleNav = (tab) => {
    setActiveNav(tab);
    if (tab !== 'group-detail') setSelectedGroupId(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Watermark logo — tiled across the whole app */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          opacity: 0.05,
          pointerEvents: 'none',
          backgroundImage: 'url("/logo.png")',
          backgroundSize: '220px 220px',
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat'
        }}
      />
      {/* Sidebar (modules only) */}
      <Sidebar
        activeNav={activeNav}
        setActiveNav={handleNav}
      />

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {/* Top navbar: brand + actions (Create, Reset, Theme, Logout) */}
        <TopNav
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onResetDemoData={handleResetDemoData}
        />
        <div className="app-container" style={{ flex: 1, padding: '1.5rem 1.75rem' }}>
          {/* Member personal dashboard */}
          {isMember && activeNav === 'dashboard' && (
            <MemberDashboard groups={groups} />
          )}

          {/* Admin/superadmin dashboard */}
          {!isMember && !isLoanBorrower && activeNav === 'dashboard' && (
            <Dashboard
              groups={groups}
              onSelectGroup={handleSelectGroup}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
              logs={logs}
              onViewReceipt={(receipt) => setReceiptData(receipt)}
            />
          )}

          {/* Loan-only borrower home = Loans (also shown if they land on dashboard) */}
          {isLoanBorrower && activeNav === 'dashboard' && (
            <LoansArea />
          )}

          {activeNav === 'groups' && (
            <GroupList
              groups={groups}
              onSelectGroup={handleSelectGroup}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          )}

          {activeNav === 'contributions' && (
            <GroupDetail
              group={groups[0] || selectedGroup || {}}
              onBack={() => setActiveNav('dashboard')}
              onLogPayment={(g) => setLogPaymentGroup(g)}
              onVerifyPayment={handleVerifyPayment}
              onViewReceipt={(receipt) => setReceiptData(receipt)}
              onOpenSwapModal={(g) => setSwapGroup(g)}
              onDisbursePayout={handleDisbursePayout}
              readOnly={isMember}
            />
          )}

          {activeNav === 'members' && (
            <MembersList
              groups={groups}
              onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
            />
          )}

          {activeNav === 'admins' && (
            <AdminsList groups={groups} />
          )}

          {activeNav === 'loans' && (
            <LoansArea />
          )}

          {activeNav === 'audit' && (
            <AuditLog logs={logs} />
          )}

          {activeNav === 'group-detail' && selectedGroup && (
            <GroupDetail
              group={selectedGroup}
              onBack={() => setActiveNav('groups')}
              onLogPayment={(g) => setLogPaymentGroup(g)}
              onVerifyPayment={handleVerifyPayment}
              onViewReceipt={(receipt) => setReceiptData(receipt)}
              onOpenSwapModal={(g) => setSwapGroup(g)}
              onDisbursePayout={handleDisbursePayout}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateGroupModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {isRegisterModalOpen && (
        <RegisterMemberModal
          groups={groups}
          onClose={() => setIsRegisterModalOpen(false)}
        />
      )}

      {logPaymentGroup && (
        <LogPaymentModal
          group={logPaymentGroup}
          onClose={() => setLogPaymentGroup(null)}
          onSubmitPayment={handleSubmitPayment}
        />
      )}

      {receiptData && (
        <ReceiptModal
          receiptData={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

      {swapGroup && (
        <SwapPositionModal
          group={swapGroup}
          onClose={() => setSwapGroup(null)}
          onSwapSubmit={handleSwapSubmit}
        />
      )}

      {/* Toast Alert */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Floating AI Assistant */}
      <AiChat groups={groups} />
    </div>
  );
}
