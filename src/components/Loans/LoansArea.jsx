import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLoans from './AdminLoans';
import MyLoans from './MyLoans';
import { AlertTriangle } from 'lucide-react';

// Top-level Loans module. Admins/superadmin get the portfolio-management view
// (review + verify), everyone else gets the borrower view. Because anyone can
// also borrow, admins see their own loans through LoanDetailModal too.
export default function LoansArea() {
  const { user } = useAuth();
  const isAdmin = user && ['admin', 'superadmin'].includes(user.role);

  // Detect offline file-storage mode: in the desktop shell (STORAGE_MODE=file)
  // the loan tables don't exist, so we surface a friendly note rather than errors.
  const isDesktop = window.savecircleDesktop?.isDesktop;

  return (
    <div>
      {isDesktop && (
        <div className="glass-card" style={{ padding: '0.9rem 1.1rem', marginBottom: '1.25rem', borderLeft: '4px solid var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
          <span>
            <strong style={{ color: 'var(--accent-gold)' }}>Loans need the online/server mode.</strong> The desktop offline shell uses file storage, where loan tables aren't available. Run the app with the backend + Vite dev server (PostgreSQL) to use Loans.
          </span>
        </div>
      )}
      {isAdmin ? <AdminLoans /> : <MyLoans />}
    </div>
  );
}
