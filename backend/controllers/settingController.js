import { Settings, CENTRAL_ACCOUNT_KEY } from '../models/Setting.js';

// Shape returned to clients. `active` decides whether the UI presents this
// account as the destination for contributions; group accounts remain
// available when it is false.
const emptyAccount = {
    bankName: '',
    accountNumber: '',
    accountName: '',
    note: '',
    active: false
};

const sanitize = (body = {}) => ({
    bankName: String(body.bankName ?? '').trim(),
    accountNumber: String(body.accountNumber ?? '').trim(),
    accountName: String(body.accountName ?? '').trim(),
    note: String(body.note ?? '').trim(),
    active: Boolean(body.active)
});

// The central account is a platform-wide setting, so EVERY signed-in user needs
// to read it (members must know where to pay). Only superadmins may change it.
export const getCentralAccount = async (req, res) => {
    try {
        const stored = await Settings.get(CENTRAL_ACCOUNT_KEY);
        res.json({ success: true, data: { ...emptyAccount, ...(stored || {}) } });
    } catch (error) {
        console.error('Get central account error:', error);
        res.status(500).json({ success: false, message: 'Failed to load central account' });
    }
};

export const updateCentralAccount = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Only a super admin can change the central account' });
        }
        const data = sanitize(req.body);

        // A half-configured account is worse than none: members would be told to
        // pay into a number nobody can reconcile.
        if (data.active && (!data.bankName || !data.accountNumber || !data.accountName)) {
            return res.status(400).json({
                success: false,
                message: 'Bank name, account number and account name are required to activate the central account'
            });
        }

        const saved = await Settings.set(CENTRAL_ACCOUNT_KEY, data);
        res.json({ success: true, data: saved, message: 'Central account updated' });
    } catch (error) {
        console.error('Update central account error:', error);
        res.status(500).json({ success: false, message: 'Failed to save central account' });
    }
};
