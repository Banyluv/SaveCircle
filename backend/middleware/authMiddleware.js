import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { JWT_SECRET } from '../config/jwt.js';

// Normalize a user row into the camelCase shape the rest of the app expects.
// PostgreSQL rows come back with snake_case columns (group_id, member_id,
// contribution_amount, withdraw_date, ...) while the API responses use camelCase.
const publicUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    groupId: user.groupId || user.group_id || null,
    memberId: user.memberId || user.member_id || null,
    bankName: user.bankName || user.bank_name || null,
    accountNumber: user.accountNumber || user.account_number || null,
    accountName: user.accountName || user.account_name || null,
    contributionAmount: user.contributionAmount ?? user.contribution_amount ?? null,
    withdrawDate: user.withdrawDate || user.withdraw_date || null,
    withdrawalStatus: user.withdrawalStatus || user.withdrawal_status || 'none',
    withdrawalAmount: user.withdrawalAmount ?? user.withdrawal_amount ?? null,
    withdrawalFee: user.withdrawalFee ?? user.withdrawal_fee ?? 0,
    orgName: user.orgName || user.org_name || null,
    phone: user.phone || null,
    address: user.address || null,
    isLoanBorrower: ['individual', 'cooperative'].includes(user.role),
    createdBy: user.createdBy ?? user.created_by ?? null
});

export const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }
            req.user = publicUser(user);
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Allows admin, superadmin, and (for backwards compatibility) trustee
export const isTrustee = (req, res, next) => {
    if (req.user && ['admin', 'superadmin', 'trustee'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

export const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as super admin' });
    }
};

// Loan borrower roles (individual/cooperative) — used to protect borrower routes
// that group members/admin may also access.
export const isLoanBorrower = (req, res, next) => {
    if (req.user && ['individual', 'cooperative', 'admin', 'superadmin'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as a loan borrower' });
    }
};
