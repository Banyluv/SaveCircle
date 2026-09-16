import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import pool from '../config/db.js';
import { JWT_SECRET } from '../config/jwt.js';
import { fileStore } from '../config/fileStore.js';

const useFileStore = () => process.env.STORAGE_MODE === 'file';

const generateToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

const publicUser = (user) => ({
    _id: user.id,
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
    isLoanBorrower: ['individual', 'cooperative'].includes(user.role || user.role)
});

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await User.matchPassword(user, password))) {
            res.json({
                ...publicUser(user),
                token: generateToken(user.id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, groupId, memberId, bankName, accountNumber, accountName, contributionAmount, orgName, phone, address } = req.body;
        const requestedRole = role || 'member';

        const loanBorrowerRoles = ['individual', 'cooperative'];
        const isCreatingBorrower = loanBorrowerRoles.includes(requestedRole);

        // Only superadmin can create admins; admins can only create members in their own group
        if (req.user) {
            if (requestedRole === 'superadmin' && req.user.role !== 'superadmin') {
                return res.status(403).json({ message: 'Only a superadmin can create another superadmin' });
            }
            if (requestedRole === 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({ message: 'Only a superadmin can create group admins' });
            }
            if (requestedRole === 'member' && groupId && req.user.role === 'admin' && req.user.groupId !== groupId) {
                return res.status(403).json({ message: 'Admins can only add members to their own group' });
            }
            // Only admins/superadmin can create loan-borrower accounts
            if (isCreatingBorrower && !['admin', 'superadmin'].includes(req.user.role)) {
                return res.status(403).json({ message: 'Only admins can create borrower accounts' });
            }
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // If a member account is being created, groupId is required
        // (loan-only borrowers: individual/cooperative do NOT need a group)
        if (requestedRole === 'member' && !groupId) {
            return res.status(400).json({ message: 'A group is required for member accounts' });
        }

        const user = await User.create({
            name: isCreatingBorrower && orgName ? orgName : name,
            email,
            password,
            role: requestedRole,
            groupId: requestedRole === 'superadmin' ? null : (groupId || null),
            memberId: memberId || null,
            bankName: bankName || null,
            accountNumber: accountNumber || null,
            accountName: accountName || null,
            contributionAmount: contributionAmount != null ? contributionAmount : null,
            orgName: orgName || null,
            phone: phone || null,
            address: address || null
        });

        if (user) {
            res.status(201).json({
                ...publicUser(user),
                token: generateToken(user.id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get all users (superadmin: all; admin: only their own group)
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({});
        let result = users;
        const adminOrSuper = ['admin', 'superadmin'].includes(req.user.role);
        const loanBorrower = ['individual', 'cooperative'].includes(req.user.role);
        if (req.user.role === 'admin') {
            // Admins see their group's members + all loan-only borrowers
            result = users.filter(u => (u.groupId === req.user.groupId || u.group_id === req.user.groupId) || ['individual', 'cooperative'].includes(u.role));
        } else if (req.user.role === 'superadmin') {
            // already all
        } else if (req.user.role === 'member') {
            result = users.filter(u => u.id === req.user.id);
        } else if (loanBorrower) {
            // a borrower sees only themselves
            result = users.filter(u => u.id === req.user.id);
        }
        void adminOrSuper;
        res.json(result.map(publicUser));
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Update a user (assign group, change role, set bank/contribution/withdrawal fields, etc.)
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, groupId, memberId, bankName, accountNumber, accountName, contributionAmount, withdrawDate, withdrawalStatus, withdrawalAmount, withdrawalFee, orgName, phone, address } = req.body;
        const target = await User.findById(id);
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Permission checks
        if (req.user.role === 'admin') {
            const isLoanBorrower = ['individual', 'cooperative'].includes(target.role);
            // Admins can manage group members of their own group, or loan borrowers
            if (!isLoanBorrower && target.id !== req.user.id && (target.groupId !== req.user.groupId && target.group_id !== req.user.groupId)) {
                return res.status(403).json({ message: 'Admins can only manage users in their own group' });
            }
        }
        if (req.user.role === 'member' || req.user.role === 'individual' || req.user.role === 'cooperative') {
            // These may only update their own profile details
            if (target.id !== req.user.id) {
                return res.status(403).json({ message: 'Users can only update their own profile' });
            }
            const allowedKeys = ['bankName', 'accountNumber', 'accountName', 'contributionAmount', 'name', 'phone', 'address', 'orgName'];
            const requestedKeys = Object.keys(req.body);
            const disallowed = requestedKeys.filter(k => k !== 'role' && k !== 'groupId' && k !== 'memberId' && !allowedKeys.includes(k));
            if (disallowed.length > 0) {
                return res.status(403).json({ message: `You cannot change: ${disallowed.join(', ')}` });
            }
        }

        const updates = {};
        if (role !== undefined) updates.role = role;
        if (groupId !== undefined) updates.groupId = groupId;
        if (memberId !== undefined) updates.memberId = memberId;
        if (bankName !== undefined) updates.bank_name = bankName;
        if (accountNumber !== undefined) updates.account_number = accountNumber;
        if (accountName !== undefined) updates.account_name = accountName;
        if (contributionAmount !== undefined) updates.contribution_amount = contributionAmount;
        if (withdrawDate !== undefined) updates.withdraw_date = withdrawDate;
        if (withdrawalStatus !== undefined) updates.withdrawal_status = withdrawalStatus;
        if (withdrawalAmount !== undefined) updates.withdrawal_amount = withdrawalAmount;
        if (withdrawalFee !== undefined) updates.withdrawal_fee = withdrawalFee;
        if (orgName !== undefined) updates.org_name = orgName;
        if (phone !== undefined) updates.phone = phone;
        if (address !== undefined) updates.address = address;

        let updated;
        if (useFileStore()) {
            const existing = await User.findById(id);
            if (existing) {
                const camelUpdates = {};
                for (const [k, v] of Object.entries(updates)) {
                    if (k === 'bank_name') camelUpdates.bankName = v;
                    else if (k === 'account_number') camelUpdates.accountNumber = v;
                    else if (k === 'account_name') camelUpdates.accountName = v;
                    else if (k === 'contribution_amount') camelUpdates.contributionAmount = v;
                    else if (k === 'withdraw_date') camelUpdates.withdrawDate = v;
                    else if (k === 'withdrawal_status') camelUpdates.withdrawalStatus = v;
                    else if (k === 'withdrawal_amount') camelUpdates.withdrawalAmount = v;
                    else if (k === 'withdrawal_fee') camelUpdates.withdrawalFee = v;
                    else if (k === 'org_name') camelUpdates.orgName = v;
                    else if (k === 'phone') camelUpdates.phone = v;
                    else if (k === 'address') camelUpdates.address = v;
                    else camelUpdates[k] = v;
                }
                updated = await User.update(id, camelUpdates);
            }
        } else {
            updated = await User.update(id, updates);
        }

        if (!updated) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(publicUser(updated));
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Member requests a withdrawal (only when their withdraw date has arrived).
// The admin's keeping fee = one contribution amount per member (the amount the
// user contributes per cycle — daily, weekly, bi-weekly or monthly). It is
// collected at the end of the circle and subtracted from the withdrawal.
export const requestWithdrawal = async (req, res) => {
    try {
        const userId = req.user.id;
        const target = await User.findById(userId);
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (target.role !== 'member') {
            return res.status(400).json({ message: 'Only members can request withdrawals' });
        }
        const withdrawDate = target.withdrawDate || target.withdraw_date;
        if (!withdrawDate) {
            return res.status(400).json({ message: 'No withdrawal date has been set for you yet. Ask your group admin.' });
        }
        const today = new Date();
        const wd = new Date(withdrawDate);
        if (today < wd) {
            return res.status(400).json({ message: `Your withdrawal date is ${wd.toDateString()}. You can request when it arrives.` });
        }
        if ((target.withdrawalStatus || target.withdrawal_status) === 'approved' || (target.withdrawalStatus || target.withdrawal_status) === 'paid') {
            return res.status(400).json({ message: 'Withdrawal already processed' });
        }

        const grossAmount = Number(target.withdrawalAmount ?? target.withdrawal_amount ?? target.contributionAmount ?? target.contribution_amount ?? 0);

        // Keeping fee = the member's per-cycle contribution amount (one cycle's
        // worth, collected by the admin at the end of the circle). This applies
        // no matter the frequency (daily/weekly/bi-weekly/monthly).
        const keepingFee = Number(target.contributionAmount ?? target.contribution_amount ?? 0) || 0;

        // Subtract the keeping fee; net can never go below 0
        const netAmount = Math.max(0, grossAmount - keepingFee);

        let updated;
        if (useFileStore()) {
            updated = await User.update(userId, {
                withdrawalStatus: 'requested',
                withdrawalAmount: netAmount,
                withdrawalFee: keepingFee
            });
        } else {
            updated = await User.update(userId, {
                withdrawal_status: 'requested',
                withdrawal_amount: netAmount,
                withdrawal_fee: keepingFee
            });
        }
        res.json(publicUser(updated));
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Admin approves/releases a member's withdrawal request
export const approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const target = await User.findById(id);
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Only admins/superadmin can approve; admin only for their own group
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (req.user.role === 'admin' && target.groupId !== req.user.groupId && target.group_id !== req.user.groupId) {
            return res.status(403).json({ message: 'Admins can only manage users in their own group' });
        }
        if ((target.withdrawalStatus || target.withdrawal_status) !== 'requested') {
            return res.status(400).json({ message: 'This user has no pending withdrawal request' });
        }
        let updated;
        if (useFileStore()) {
            updated = await User.update(id, { withdrawalStatus: 'paid' });
        } else {
            updated = await User.update(id, { withdrawal_status: 'paid' });
        }
        res.json(publicUser(updated));
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Delete a user
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const target = await User.findById(id);
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (req.user.role === 'admin') {
            if (target.groupId !== req.user.groupId && target.group_id !== req.user.groupId) {
                return res.status(403).json({ message: 'Admins can only remove users in their own group' });
            }
        }
        if (useFileStore()) {
            await fileStore.deleteOne('users', id);
        } else {
            await pool.query('DELETE FROM users WHERE id = $1', [id]);
        }
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
