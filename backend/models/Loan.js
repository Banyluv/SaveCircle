import pool from '../config/db.js';
import { fileStore } from '../config/fileStore.js';

const useFileStore = () => process.env.STORAGE_MODE === 'file';

// Loan feature tables (merged from the SaveCircle loan module).
// Borrowers are the existing SaveCircle `users` (SERIAL integer ids), so the
// loan tables reference users.id with plain integer columns (NOT UUIDs).
//
// CREATE TABLE IF NOT EXISTS does not migrate existing tables, so every table
// also gets ALTER TABLE ... ADD COLUMN IF NOT EXISTS for forward-compat (same
// pattern as models/User.js).
export const initLoansTable = async () => {
    if (useFileStore()) return;

    // ── Loan products (templates defined by admins/superadmin) ──────────────
    await pool.query(`
        CREATE TABLE IF NOT EXISTS loan_products (
            id SERIAL PRIMARY KEY,
            lender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            description TEXT,
            loan_type TEXT NOT NULL DEFAULT 'personal'
                CHECK (loan_type IN ('personal','business','cooperative','emergency','mortgage','auto')),
            min_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
            max_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
            min_interest_rate NUMERIC(5,2) NOT NULL DEFAULT 1,
            max_interest_rate NUMERIC(5,2) NOT NULL DEFAULT 5,
            min_tenure_months INTEGER NOT NULL DEFAULT 1,
            max_tenure_months INTEGER NOT NULL DEFAULT 12,
            interest_type TEXT NOT NULL DEFAULT 'flat'
                CHECK (interest_type IN ('flat','reducing','compound')),
            repayment_frequency TEXT NOT NULL DEFAULT 'monthly'
                CHECK (repayment_frequency IN ('daily','weekly','monthly','quarterly','annually','lump_sum')),
            processing_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
            late_payment_penalty_percent NUMERIC(5,2) NOT NULL DEFAULT 2,
            grace_period_days INTEGER NOT NULL DEFAULT 3,
            requires_guarantor BOOLEAN NOT NULL DEFAULT false,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // ── Loan applications (submitted by any user, reviewed by admin/superadmin) ──
    await pool.query(`
        CREATE TABLE IF NOT EXISTS loan_applications (
            id SERIAL PRIMARY KEY,
            borrower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            lender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            product_id INTEGER REFERENCES loan_products(id) ON DELETE SET NULL,
            application_number TEXT UNIQUE NOT NULL,
            loan_type TEXT NOT NULL DEFAULT 'personal',
            principal_amount NUMERIC(15,2) NOT NULL,
            interest_rate NUMERIC(5,2) NOT NULL,
            interest_type TEXT NOT NULL DEFAULT 'flat'
                CHECK (interest_type IN ('flat','reducing','compound')),
            tenure_months INTEGER NOT NULL,
            repayment_frequency TEXT NOT NULL DEFAULT 'monthly'
                CHECK (repayment_frequency IN ('daily','weekly','monthly','quarterly','annually','lump_sum')),
            processing_fee NUMERIC(15,2) NOT NULL DEFAULT 0,
            purpose TEXT,
            collateral TEXT,
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','under_review','approved','rejected','disbursed','active','completed','defaulted','cancelled')),
            rejection_reason TEXT,
            applied_at TIMESTAMPTZ DEFAULT NOW(),
            reviewed_at TIMESTAMPTZ,
            approved_at TIMESTAMPTZ,
            disbursed_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // ── Loan schedules (amortization installments) ──────────────────────────
    await pool.query(`
        CREATE TABLE IF NOT EXISTS loan_schedules (
            id SERIAL PRIMARY KEY,
            loan_id INTEGER NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
            installment_number INTEGER NOT NULL,
            due_date DATE NOT NULL,
            principal_component NUMERIC(15,2) NOT NULL DEFAULT 0,
            interest_component NUMERIC(15,2) NOT NULL DEFAULT 0,
            total_installment NUMERIC(15,2) NOT NULL DEFAULT 0,
            outstanding_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','paid','overdue','waived','partial')),
            amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
            paid_at TIMESTAMPTZ,
            days_overdue INTEGER NOT NULL DEFAULT 0,
            penalty_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // ── Loan accounts (one per approved/disbursed loan) ─────────────────────
    await pool.query(`
        CREATE TABLE IF NOT EXISTS loan_accounts (
            id SERIAL PRIMARY KEY,
            loan_id INTEGER UNIQUE NOT NULL REFERENCES loan_applications(id) ON DELETE RESTRICT,
            account_number TEXT UNIQUE NOT NULL,
            borrower_id INTEGER NOT NULL REFERENCES users(id),
            principal_amount NUMERIC(15,2) NOT NULL,
            total_interest NUMERIC(15,2) NOT NULL,
            total_amount_payable NUMERIC(15,2) NOT NULL,
            amount_disbursed NUMERIC(15,2) NOT NULL,
            outstanding_balance NUMERIC(15,2) NOT NULL,
            total_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
            next_due_date DATE,
            next_installment_amount NUMERIC(15,2),
            start_date DATE NOT NULL,
            maturity_date DATE NOT NULL,
            status TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','completed','defaulted','suspended')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // ── Loan repayments (manual transfers submitted by borrower, verified by admin) ──
    await pool.query(`
        CREATE TABLE IF NOT EXISTS loan_repayments (
            id SERIAL PRIMARY KEY,
            loan_id INTEGER NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
            borrower_id INTEGER NOT NULL REFERENCES users(id),
            amount NUMERIC(15,2) NOT NULL,
            channel TEXT,
            reference TEXT,
            proof_note TEXT,
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','verified','rejected')),
            submitted_at TIMESTAMPTZ DEFAULT NOW(),
            verified_by INTEGER REFERENCES users(id),
            verified_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // Indexes for common lookups
    await pool.query('CREATE INDEX IF NOT EXISTS idx_loan_applications_borrower ON loan_applications(borrower_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_loan_schedules_loan ON loan_schedules(loan_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_loan_accounts_loan ON loan_accounts(loan_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan ON loan_repayments(loan_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_loan_repayments_status ON loan_repayments(status)');
};

export default { initLoansTable };
