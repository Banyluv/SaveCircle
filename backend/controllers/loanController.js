import pool from '../config/db.js';
import { fileStore } from '../config/fileStore.js';
import {
    generateAmortizationSchedule,
    calculateProcessingFee,
    quickQuote
} from '../utils/loanCalculator.js';
import { notifyBorrower, notifyAdmins } from './notificationController.js';

const useFileStore = () => process.env.STORAGE_MODE === 'file';

// Loans live in PostgreSQL only (they are DB-native, not file-store synced).
// If running in offline file mode, return a clear 503 so the UI can explain.
const requireDb = (req, res) => {
    if (useFileStore()) {
        res.status(503).json({ success: false, message: 'Loans are only available in online/server mode (PostgreSQL).' });
        return false;
    }
    return true;
};

const isAdminRole = (user) => user && ['admin', 'superadmin'].includes(user.role);

// Can this admin act on this borrower's loan?
// superadmin: yes. Group admin: only if the borrower belongs to their group, or
// they were the admin who registered the borrower. Without this a group admin
// could approve/reject/verify loans belonging to a different group.
const adminCanAccessBorrower = async (query, user, borrowerId) => {
    if (user.role === 'superadmin') return true;
    const res = await query(
        `SELECT 1 FROM users
         WHERE id = $1 AND (group_id = $2 OR created_by = $3)
         LIMIT 1`,
        [borrowerId, user.groupId || null, Number(user.id)]
    );
    return res.rows.length > 0;
};

// Postgres integer columns reject non-numeric strings with a 22P02 error, which
// would surface as a 500. Validate route params up front and return 400 instead.
const parseIntParam = (value) => {
    if (value === undefined || value === null || value === '') return null;
    if (!/^\d+$/.test(String(value))) return null;
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : null;
};

// A route param that must be a positive integer id.
const requireIdParam = (req, res, name = 'id') => {
    const id = parseIntParam(req.params[name]);
    if (id === null) {
        res.status(400).json({ success: false, message: `Invalid ${name}: must be a numeric id` });
        return null;
    }
    return id;
};

// Parse a money amount, rejecting NaN/Infinity/negatives.
const parseAmount = (value) => {
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return +n.toFixed(2);
};

// ─── Quick Calculator (public) ───────────────────────────────────────────────
export const calculate = async (req, res) => {
    if (!requireDb(req, res)) return;
    try {
        const { principal, annualRate, tenureMonths, frequency, interestType, processingFeePercent } = req.body;
        if (!principal || !annualRate || !tenureMonths || !frequency || !interestType) {
            return res.status(400).json({ success: false, message: 'Missing required calculation parameters' });
        }
        const result = quickQuote({
            principal: parseFloat(principal),
            annualRate: parseFloat(annualRate),
            tenureMonths: parseInt(tenureMonths),
            frequency,
            interestType,
            processingFeePercent: parseFloat(processingFeePercent || 0),
        });
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Calculate error:', error);
        res.status(500).json({ success: false, message: 'Calculation failed', error: error.message });
    }
};

// ─── Amortization preview (public) ───────────────────────────────────────────
export const getAmortizationSchedule = async (req, res) => {
    if (!requireDb(req, res)) return;
    try {
        const { principal, rate, tenure, frequency, interestType } = req.query;
        const { schedule, summary } = generateAmortizationSchedule(
            parseFloat(principal),
            parseFloat(rate),
            parseInt(tenure),
            frequency,
            interestType
        );
        res.json({ success: true, data: { summary, schedule } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Schedule generation failed' });
    }
};

// ─── Loan products ───────────────────────────────────────────────────────────
export const getLoanProducts = async (req, res) => {
    if (!requireDb(req, res)) return;
    try {
        const result = await pool.query(
            `SELECT lp.*, u.name as lender_name
             FROM loan_products lp
             LEFT JOIN users u ON u.id = lp.lender_id
             WHERE lp.is_active = true
             ORDER BY lp.created_at DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Failed to load loan products' });
    }
};

export const createLoanProduct = async (req, res) => {
    if (!requireDb(req, res)) return;
    if (!isAdminRole(req.user)) {
        return res.status(403).json({ success: false, message: 'Only admins can create loan products' });
    }
    try {
        const {
            name, description, loan_type, min_amount, max_amount,
            min_interest_rate, max_interest_rate, min_tenure_months, max_tenure_months,
            interest_type, repayment_frequency, processing_fee_percent,
            late_payment_penalty_percent, grace_period_days, requires_guarantor
        } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Product name is required' });

        const result = await pool.query(
            `INSERT INTO loan_products (
                lender_id, name, description, loan_type,
                min_amount, max_amount, min_interest_rate, max_interest_rate,
                min_tenure_months, max_tenure_months, interest_type, repayment_frequency,
                processing_fee_percent, late_payment_penalty_percent, grace_period_days, requires_guarantor
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
            RETURNING *`,
            [req.user.id, name, description || null, loan_type || 'personal',
                min_amount || 0, max_amount || 0, min_interest_rate || 1, max_interest_rate || 5,
                min_tenure_months || 1, max_tenure_months || 12, interest_type || 'flat',
                repayment_frequency || 'monthly', processing_fee_percent || 0,
                late_payment_penalty_percent || 2, grace_period_days || 3, requires_guarantor || false]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    }
};

// ─── Apply for loan ──────────────────────────────────────────────────────────
export const applyForLoan = async (req, res) => {
    if (!requireDb(req, res)) return;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const {
            loan_type, principal_amount, interest_rate, interest_type,
            tenure_months, repayment_frequency, purpose, collateral, product_id, borrower_id
        } = req.body;

        if (!principal_amount || !interest_rate || !tenure_months || !repayment_frequency || !interest_type) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Missing required loan fields' });
        }

        // Determine whose application this is:
        // - admins/superadmin may apply ON BEHALF of another borrower (borrower_id)
        // - anyone else applies for themselves
        const isAdmin = isAdminRole(req.user);
        let borrowerId = req.user.id;
        if (borrower_id != null) {
            if (!isAdmin) {
                await client.query('ROLLBACK');
                return res.status(403).json({ success: false, message: 'Only admins can apply on behalf of a borrower' });
            }
            borrowerId = borrower_id;
        }

        // Verify the borrower exists and is a valid borrower (member/individual/cooperative/admin/superadmin)
        const borrowerRes = await client.query('SELECT id, role FROM users WHERE id = $1', [borrowerId]);
        if (!borrowerRes.rows[0]) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Borrower not found' });
        }

        const appNumber = `LN${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100)}`;

        let processing_fee = 0;
        if (product_id) {
            const prod = await client.query('SELECT processing_fee_percent FROM loan_products WHERE id = $1', [product_id]);
            if (prod.rows[0]) {
                processing_fee = calculateProcessingFee(principal_amount, prod.rows[0].processing_fee_percent);
            }
        }

        const appResult = await client.query(
            `INSERT INTO loan_applications (
                borrower_id, product_id, application_number, loan_type,
                principal_amount, interest_rate, interest_type, tenure_months,
                repayment_frequency, processing_fee, purpose, collateral, status
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')
            RETURNING *`,
            [borrowerId, product_id || null, appNumber, loan_type || 'personal',
                principal_amount, interest_rate, interest_type, tenure_months,
                repayment_frequency, processing_fee, purpose || null, collateral || null]
        );
        const created = appResult.rows[0];

        // Notify the borrower that their application was received (if an admin
        // filed it on their behalf, also inform the admin who filed it is aware).
        const borrowerInfo = await client.query('SELECT name FROM users WHERE id = $1', [borrowerId]);
        const borrowerName = borrowerInfo.rows[0]?.name || 'A borrower';

        // Notify admins of the new pending application (all admin/superadmin)
        await client.query('COMMIT');

        // Fire notifications after commit (outside the transaction)
        try {
            // 1) Let the borrower know their application is submitted & pending
            await notifyBorrower({
                userId: borrowerId,
                type: 'general',
                title: 'Loan Application Submitted',
                message: `Your ${loan_type || 'loan'} application ${appNumber} for ₦${Number(principal_amount).toLocaleString()} has been submitted and is awaiting review.`,
                link: `/loans`
            });

            // 2) Notify admins a new application is waiting (unless the acting
            //    user is the only admin and applied for themselves — still useful)
            await notifyAdmins({
                type: 'loan_applied',
                title: 'New Loan Application',
                message: `${borrowerName} applied for ₦${Number(principal_amount).toLocaleString()} (${loan_type || 'loan'}) — ${appNumber}.`,
                link: `/loans`,
                excludeUserId: isAdmin ? req.user.id : null
            });
        } catch (notifErr) {
            console.error('Notification dispatch error (apply):', notifErr);
        }

        res.status(201).json({ success: true, message: 'Loan application submitted successfully', data: created });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Apply loan error:', error);
        res.status(500).json({ success: false, message: 'Application failed', error: error.message });
    } finally {
        client.release();
    }
};

// ─── My loans (borrower) ─────────────────────────────────────────────────────
export const getMyLoans = async (req, res) => {
    if (!requireDb(req, res)) return;
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE la.borrower_id = $1';
        const params = [req.user.id];
        if (status) {
            params.push(status);
            whereClause += ` AND la.status = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT la.*, lp.name as product_name,
                    lac.account_number, lac.outstanding_balance, lac.next_due_date,
                    lac.next_installment_amount, lac.total_paid, lac.total_amount_payable,
                    (SELECT COUNT(*) FROM loan_schedules ls WHERE ls.loan_id = la.id AND ls.status IN ('paid','partial')) as installments_paid,
                    (SELECT COUNT(*) FROM loan_schedules ls WHERE ls.loan_id = la.id) as total_installments
             FROM loan_applications la
             LEFT JOIN loan_products lp ON lp.id = la.product_id
             LEFT JOIN loan_accounts lac ON lac.loan_id = la.id
             ${whereClause}
             ORDER BY la.created_at DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset]
        );

        res.json({ success: true, data: { loans: result.rows } });
    } catch (error) {
        console.error('Get loans error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch loans' });
    }
};

// ─── Loan detail (borrower or admin) ─────────────────────────────────────────
export const getLoanDetails = async (req, res) => {
    if (!requireDb(req, res)) return;
    const id = requireIdParam(req, res, 'id');
    if (id === null) return;
    try {

        const loanResult = await pool.query(
            `SELECT la.*, lp.name as product_name, lp.late_payment_penalty_percent, lp.grace_period_days,
                    lac.id as account_id, lac.account_number, lac.outstanding_balance,
                    lac.total_paid, lac.total_amount_payable, lac.next_due_date, lac.next_installment_amount,
                    lac.maturity_date, lac.start_date,
                    u.name as borrower_name, u.email as borrower_email
             FROM loan_applications la
             LEFT JOIN loan_products lp ON lp.id = la.product_id
             LEFT JOIN loan_accounts lac ON lac.loan_id = la.id
             LEFT JOIN users u ON u.id = la.borrower_id
             WHERE la.id = $1`,
            [id]
        );

        if (!loanResult.rows[0]) {
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }
        const loan = loanResult.rows[0];
        const isOwner = String(loan.borrower_id) === String(req.user.id);
        const isAdmin = isAdminRole(req.user);
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this loan' });
        }

        const scheduleResult = await pool.query(
            `SELECT * FROM loan_schedules WHERE loan_id = $1 ORDER BY installment_number ASC`, [id]
        );

        const repaymentsResult = await pool.query(
            `SELECT r.*, u.name as verified_by_name
             FROM loan_repayments r
             LEFT JOIN users u ON u.id = r.verified_by
             WHERE r.loan_id = $1
             ORDER BY r.submitted_at DESC`, [id]
        );

        res.json({ success: true, data: { loan, schedule: scheduleResult.rows, repayments: repaymentsResult.rows } });
    } catch (error) {
        console.error('Get loan details error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch loan details' });
    }
};

// ─── Dashboard stats (borrower view) ─────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
    if (!requireDb(req, res)) return;
    try {
        const userId = req.user.id;
        const [loansStats, upcomingPayments, recentRepayments] = await Promise.all([
            pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE la.status IN ('active','disbursed')) as active_loans,
                    COUNT(*) FILTER (WHERE la.status = 'pending') as pending_loans,
                    COUNT(*) FILTER (WHERE la.status = 'completed') as completed_loans,
                    COALESCE(SUM(lac.outstanding_balance) FILTER (WHERE la.status IN ('active','disbursed')), 0) as total_outstanding,
                    COALESCE(SUM(lac.total_paid) FILTER (WHERE la.status IN ('active','disbursed','completed')), 0) as total_paid
                 FROM loan_applications la
                 LEFT JOIN loan_accounts lac ON lac.loan_id = la.id
                 WHERE la.borrower_id = $1`,
                [userId]
            ),
            pool.query(
                `SELECT ls.due_date, ls.total_installment, ls.status,
                        la.application_number, la.loan_type, lac.account_number
                 FROM loan_schedules ls
                 JOIN loan_applications la ON la.id = ls.loan_id
                 JOIN loan_accounts lac ON lac.loan_id = la.id
                 WHERE la.borrower_id = $1 AND ls.status IN ('pending','partial')
                   AND ls.due_date >= CURRENT_DATE
                 ORDER BY ls.due_date ASC LIMIT 5`,
                [userId]
            ),
            pool.query(
                `SELECT r.amount, r.status, r.submitted_at, r.reference, la.application_number
                 FROM loan_repayments r
                 JOIN loan_applications la ON la.id = r.loan_id
                 WHERE r.borrower_id = $1
                 ORDER BY r.submitted_at DESC LIMIT 5`,
                [userId]
            ),
        ]);

        res.json({
            success: true,
            data: {
                stats: loansStats.rows[0],
                upcoming_payments: upcomingPayments.rows,
                recent_repayments: recentRepayments.rows,
            },
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to load dashboard' });
    }
};

// ─── Admin: registered loan borrowers (individual/cooperative) ───────────────
export const getBorrowers = async (req, res) => {
    if (!requireDb(req, res)) return;
    if (!isAdminRole(req.user)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    try {
        // superadmin sees every borrower. A group admin sees only the borrowers
        // they registered, so one group admin cannot browse another's book.
        const isSuper = req.user.role === 'superadmin';
        const params = [];
        let ownerFilter = '';
        if (!isSuper) {
            params.push(Number(req.user.id));
            ownerFilter = ` AND u.created_by = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.group_id, u.member_id,
                    u.bank_name, u.account_number, u.account_name,
                    u.org_name, u.phone, u.address, u.created_by, u.created_at,
                    (SELECT COUNT(*) FROM loan_applications la
                      WHERE la.borrower_id = u.id AND la.status IN ('active','disbursed')) as active_loans,
                    (SELECT COUNT(*) FROM loan_applications la
                      WHERE la.borrower_id = u.id AND la.status = 'pending') as pending_loans,
                    (SELECT COALESCE(SUM(lac.outstanding_balance),0) FROM loan_applications la
                      JOIN loan_accounts lac ON lac.loan_id = la.id
                      WHERE la.borrower_id = u.id AND la.status IN ('active','disbursed')) as outstanding
             FROM users u
             WHERE u.role IN ('individual','cooperative')${ownerFilter}
             ORDER BY u.created_at DESC`,
            params
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get borrowers error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch borrowers' });
    }
};

// ─── Admin: all applications ─────────────────────────────────────────────────
export const getAllApplications = async (req, res) => {
    if (!requireDb(req, res)) return;
    if (!isAdminRole(req.user)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let where = 'WHERE 1=1';
        const params = [];

        // A group admin only sees applications belonging to their own group's
        // members, or to borrowers they registered. superadmin sees everything.
        if (req.user.role !== 'superadmin') {
            params.push(req.user.groupId || null, Number(req.user.id));
            where += ` AND (u.group_id = $${params.length - 1} OR u.created_by = $${params.length})`;
        }

        if (status) {
            params.push(status);
            where += ` AND la.status = $${params.length}`;
        }

        const result = await pool.query(
            `SELECT la.*,
                    u.name as borrower_name, u.email as borrower_email,
                    u.role as borrower_role, u.group_id
             FROM loan_applications la
             JOIN users u ON u.id = la.borrower_id
             ${where}
             ORDER BY la.created_at DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset]
        );
        res.json({ success: true, data: { applications: result.rows } });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch applications' });
    }
};

// ─── Admin: review (approve / reject) a loan application ─────────────────────
export const reviewLoan = async (req, res) => {
    if (!requireDb(req, res)) return;
    if (!isAdminRole(req.user)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const id = requireIdParam(req, res, 'id');
    if (id === null) return;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { action, rejection_reason } = req.body;

        const loanRes = await client.query('SELECT * FROM loan_applications WHERE id = $1', [id]);
        if (!loanRes.rows[0]) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Loan not found' });
        }
        const loan = loanRes.rows[0];
        let approved = false;

        // Group admins may only review loans for their own group's borrowers.
        if (!(await adminCanAccessBorrower(client.query.bind(client), req.user, loan.borrower_id))) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'This loan belongs to another group' });
        }

        if (action === 'reject') {
            await client.query(
                `UPDATE loan_applications SET status='rejected', rejection_reason=$1, reviewed_at=NOW() WHERE id=$2`,
                [rejection_reason || 'Declined', id]
            );
        } else if (action === 'approve') {
            // Only pending/under_review applications can be approved
            if (!['pending', 'under_review', 'approved'].includes(loan.status)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: `Cannot approve a loan in status "${loan.status}"` });
            }

            await client.query(
                `UPDATE loan_applications SET status='approved', approved_at=NOW(), lender_id=$1 WHERE id=$2`,
                [req.user.id, id]
            );

            const { summary, schedule } = generateAmortizationSchedule(
                parseFloat(loan.principal_amount),
                parseFloat(loan.interest_rate),
                loan.tenure_months,
                loan.repayment_frequency,
                loan.interest_type,
                new Date()
            );

            const accountNumber = `ACC${Date.now().toString().slice(-8)}`;
            const maturityDate = schedule[schedule.length - 1].due_date;

            const accRes = await client.query(
                `INSERT INTO loan_accounts (
                    loan_id, account_number, borrower_id, principal_amount,
                    total_interest, total_amount_payable, amount_disbursed, outstanding_balance,
                    next_due_date, next_installment_amount, start_date, maturity_date
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                RETURNING id`,
                [id, accountNumber, loan.borrower_id,
                    loan.principal_amount, summary.totalInterest, summary.totalPayable,
                    Number(loan.principal_amount) - Number(loan.processing_fee || 0),
                    summary.totalPayable, schedule[0].due_date, summary.installmentAmount,
                    new Date().toISOString().split('T')[0], maturityDate]
            );

            for (const s of schedule) {
                await client.query(
                    `INSERT INTO loan_schedules (loan_id, installment_number, due_date,
                        principal_component, interest_component, total_installment, outstanding_balance)
                     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                    [id, s.installment_number, s.due_date,
                        s.principal_component, s.interest_component, s.total_installment, s.outstanding_balance]
                );
            }

            await client.query(
                `UPDATE loan_applications SET status='disbursed', disbursed_at=NOW() WHERE id=$1`, [id]
            );
            void accRes;
            approved = true;
        } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
        }

        await client.query('COMMIT');

        // Notify the borrower about approval or rejection
        try {
            const borrowerInfo = await pool.query('SELECT name FROM users WHERE id = $1', [loan.borrower_id]);
            const borrowerName = borrowerInfo.rows[0]?.name || 'A borrower';

            if (approved) {
                await notifyBorrower({
                    userId: loan.borrower_id,
                    type: 'loan_approved',
                    title: 'Loan Approved & Disbursed 🎉',
                    message: `Congratulations ${borrowerName}! Your loan application ${loan.application_number} of ₦${Number(loan.principal_amount).toLocaleString()} was approved and disbursed.`,
                    link: `/loans`
                });
            } else {
                await notifyBorrower({
                    userId: loan.borrower_id,
                    type: 'loan_rejected',
                    title: 'Loan Application Rejected',
                    message: `Your loan application ${loan.application_number} was declined.${rejection_reason ? ` Reason: ${rejection_reason}` : ''}`,
                    link: `/loans`
                });
            }
        } catch (notifErr) {
            console.error('Notification dispatch error (review):', notifErr);
        }

        res.json({ success: true, message: `Loan ${action === 'approve' ? 'approved & disbursed' : 'rejected'} successfully` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Review loan error:', error);
        res.status(500).json({ success: false, message: 'Review failed', error: error.message });
    } finally {
        client.release();
    }
};

// ─── Admin: portfolio stats ──────────────────────────────────────────────────
export const getAdminStats = async (req, res) => {
    if (!requireDb(req, res)) return;
    if (!isAdminRole(req.user)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    try {
        // Group admins are scoped to their own group's borrowers so the
        // dashboard totals reflect only what their group actually lent.
        const isSuper = req.user.role === 'superadmin';
        const scopeJoin = isSuper ? '' : 'JOIN users su ON su.id = la.borrower_id';
        const scopeWhere = isSuper
            ? ''
            : `WHERE (su.group_id = $1 OR su.created_by = $2)`;
        const scopeParams = isSuper ? [] : [req.user.groupId || null, Number(req.user.id)];

        const [overview, byStatus, byType, pendingRepayments] = await Promise.all([
            pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE la.status IN ('active','disbursed')) as active_loans,
                    COUNT(*) FILTER (WHERE la.status = 'pending') as pending_applications,
                    COUNT(*) FILTER (WHERE la.status = 'completed') as completed_loans,
                    COALESCE(SUM(lac.outstanding_balance) FILTER (WHERE la.status IN ('active','disbursed')), 0) as total_outstanding,
                    COALESCE(SUM(lac.total_paid), 0) as total_collected,
                    COALESCE(SUM(la.principal_amount) FILTER (WHERE la.status IN ('active','disbursed')), 0) as total_portfolio
                 FROM loan_applications la
                 LEFT JOIN loan_accounts lac ON lac.loan_id = la.id
                 ${scopeJoin}
                 ${scopeWhere}`,
                scopeParams
            ),
            pool.query(
                `SELECT la.status, COUNT(*) as count
                 FROM loan_applications la ${scopeJoin} ${scopeWhere}
                 GROUP BY la.status`,
                scopeParams
            ),
            pool.query(
                `SELECT la.loan_type, COUNT(*) as count, SUM(la.principal_amount) as total
                 FROM loan_applications la ${scopeJoin} ${scopeWhere}
                 GROUP BY la.loan_type`,
                scopeParams
            ),
            pool.query(
                `SELECT r.id, r.loan_id, r.amount, r.channel, r.reference, r.proof_note, r.submitted_at,
                        u.name as borrower_name, la.application_number
                 FROM loan_repayments r
                 JOIN users u ON u.id = r.borrower_id
                 JOIN loan_applications la ON la.id = r.loan_id
                 WHERE r.status = 'pending'
                 ${isSuper ? '' : 'AND (u.group_id = $1 OR u.created_by = $2)'}
                 ORDER BY r.submitted_at ASC`,
                scopeParams
            ),
        ]);

        res.json({
            success: true,
            data: {
                overview: overview.rows[0],
                byStatus: byStatus.rows,
                byType: byType.rows,
                pendingRepayments: pendingRepayments.rows,
            },
        });
    } catch (e) {
        console.error('Stats failed:', e);
        res.status(500).json({ success: false, message: 'Stats failed' });
    }
};

// ─── Submit a manual repayment (borrower) ────────────────────────────────────
export const submitRepayment = async (req, res) => {
    if (!requireDb(req, res)) return;
    const id = requireIdParam(req, res, 'id');
    if (id === null) return;
    try {
        const { amount, channel, reference, proof_note } = req.body;
        const parsedAmount = parseAmount(amount);
        if (parsedAmount === null) {
            return res.status(400).json({ success: false, message: 'A valid repayment amount is required' });
        }

        const loanRes = await pool.query(
            `SELECT * FROM loan_applications WHERE id = $1`, [id]
        );
        if (!loanRes.rows[0]) return res.status(404).json({ success: false, message: 'Loan not found' });
        const loan = loanRes.rows[0];

        const isOwner = String(loan.borrower_id) === String(req.user.id);
        const isAdmin = isAdminRole(req.user);
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Only the borrower (or an admin) can submit a repayment' });
        }
        if (!['active', 'disbursed'].includes(loan.status)) {
            return res.status(400).json({ success: false, message: 'Only active/disbursed loans can be repaid' });
        }

        // Reject repayments that exceed what is still owed. Previously the excess
        // was quietly dropped when the schedule was applied, so a borrower could
        // pay too much and lose the difference with no warning.
        const accountRes = await pool.query(
            `SELECT outstanding_balance FROM loan_accounts WHERE loan_id = $1`, [id]
        );
        const outstanding = Number(accountRes.rows[0]?.outstanding_balance ?? 0);
        if (outstanding <= 0) {
            return res.status(400).json({
                success: false,
                message: 'This loan is already fully repaid — no payment is needed.'
            });
        }
        if (parsedAmount > outstanding) {
            return res.status(400).json({
                success: false,
                message: `Amount exceeds the outstanding balance of ₦${outstanding.toLocaleString()}`,
                data: { outstanding_balance: outstanding }
            });
        }

        // Always attribute the repayment to the loan's borrower, not to whoever
        // submitted it. When an admin records a repayment for a borrower, using
        // req.user.id stored the ADMIN as the payer and broke the borrower's
        // repayment history (and their notifications).
        const result = await pool.query(
            `INSERT INTO loan_repayments (loan_id, borrower_id, amount, channel, reference, proof_note, status)
             VALUES ($1,$2,$3,$4,$5,$6,'pending')
             RETURNING *`,
            [id, loan.borrower_id, parsedAmount, channel || 'Manual Transfer', reference || null, proof_note || null]
        );

        // Notify admins a repayment is awaiting verification
        try {
            const me = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
            const myName = me.rows[0]?.name || 'A borrower';
            await notifyAdmins({
                type: 'repayment_submitted',
                title: 'Repayment Submitted',
                message: `${myName} submitted a repayment of ₦${Number(parsedAmount).toLocaleString()}${channel ? ` via ${channel}` : ''} on loan ${loan.application_number}.`,
                link: '/loans'
            });
        } catch (notifErr) {
            console.error('Notification dispatch error (repay):', notifErr);
        }

        res.status(201).json({ success: true, message: 'Repayment submitted for verification', data: result.rows[0] });
    } catch (error) {
        console.error('Submit repayment error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit repayment', error: error.message });
    }
};

// ─── Admin: verify a manual repayment & apply it to the schedule ─────────────
export const verifyRepayment = async (req, res) => {
    if (!requireDb(req, res)) return;
    if (!isAdminRole(req.user)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const rid = requireIdParam(req, res, 'rid');
    if (rid === null) return;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const repayRes = await client.query(
            `SELECT * FROM loan_repayments WHERE id = $1`, [rid]
        );
        if (!repayRes.rows[0]) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Repayment not found' });
        }
        const repayment = repayRes.rows[0];

        // Group admins may only verify repayments for their own group's borrowers.
        if (!(await adminCanAccessBorrower(client.query.bind(client), req.user, repayment.borrower_id))) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'This repayment belongs to another group' });
        }

        if (repayment.status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Repayment already processed' });
        }

        // Mark verified
        await client.query(
            `UPDATE loan_repayments SET status='verified', verified_by=$1, verified_at=NOW() WHERE id=$2`,
            [req.user.id, rid]
        );

        // Apply the amount across unpaid installments (oldest first)
        let remaining = Number(repayment.amount);
        const sched = await client.query(
            `SELECT * FROM loan_schedules
             WHERE loan_id = $1 AND status IN ('pending','partial')
             ORDER BY installment_number ASC`, [repayment.loan_id]
        );

        for (const s of sched.rows) {
            if (remaining <= 0) break;
            const owed = Number(s.total_installment) - Number(s.amount_paid);
            if (owed <= 0) continue;
            const applied = Math.min(remaining, owed);
            remaining = +(remaining - applied).toFixed(2);
            const newPaid = +(Number(s.amount_paid) + applied).toFixed(2);
            const newStatus = newPaid >= Number(s.total_installment) ? 'paid' : 'partial';
            await client.query(
                `UPDATE loan_schedules
                 SET amount_paid = $1, status = $2, paid_at = CASE WHEN $2 = 'paid' THEN NOW() ELSE paid_at END
                 WHERE id = $3`,
                [newPaid, newStatus, s.id]
            );
        }

        // Update account totals
        const acct = await client.query(
            `SELECT * FROM loan_accounts WHERE loan_id = $1`, [repayment.loan_id]
        );
        if (acct.rows[0]) {
            const acc = acct.rows[0];
            const newTotalPaid = +(Number(acc.total_paid) + (Number(repayment.amount) - remaining)).toFixed(2);
            const newOutstanding = Math.max(0, +(Number(acc.total_amount_payable) - newTotalPaid).toFixed(2));

            const nextDue = await client.query(
                `SELECT due_date FROM loan_schedules
                 WHERE loan_id = $1 AND status IN ('pending','partial')
                 ORDER BY installment_number ASC LIMIT 1`, [repayment.loan_id]
            );

            const isPaidOff = newOutstanding <= 0;
            await client.query(
                `UPDATE loan_accounts
                 SET total_paid = $1, outstanding_balance = $2,
                     next_due_date = $3,
                     status = $4
                 WHERE id = $5`,
                [newTotalPaid, newOutstanding,
                    nextDue.rows[0] ? nextDue.rows[0].due_date : null,
                    isPaidOff ? 'completed' : 'active', acc.id]
            );

            if (isPaidOff) {
                await client.query(
                    `UPDATE loan_applications SET status='completed', completed_at=NOW() WHERE id=$1`,
                    [repayment.loan_id]
                );
            }
        }

        await client.query('COMMIT');

        // Notify the borrower that their repayment was verified & applied
        try {
            const loanInfo = await pool.query(
                `SELECT la.application_number, u.name AS borrower_name
                 FROM loan_applications la JOIN users u ON u.id = la.borrower_id
                 WHERE la.id = $1`, [repayment.loan_id]
            );
            const appNum = loanInfo.rows[0]?.application_number || '';
            await notifyBorrower({
                userId: repayment.borrower_id,
                type: 'repayment_verified',
                title: 'Repayment Verified ✅',
                message: `Your repayment of ₦${Number(repayment.amount).toLocaleString()} on loan ${appNum} was verified and applied to your schedule.`,
                link: `/loans`
            });
        } catch (notifErr) {
            console.error('Notification dispatch error (verify repayment):', notifErr);
        }

        res.json({ success: true, message: 'Repayment verified and applied' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Verify repayment error:', error);
        res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
    } finally {
        client.release();
    }
};
