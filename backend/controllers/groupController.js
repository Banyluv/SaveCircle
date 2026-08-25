import Group from '../models/Group.js';

// Role-aware group listing:
// - superadmin: sees ALL groups
// - admin: sees only their own group (by groupId)
// - member: sees only their own group (by groupId), with member-private data
export const getGroups = async (req, res) => {
    try {
        const allGroups = await Group.find({});
        let groups = allGroups;
        const { role, groupId, memberId } = req.user || {};

        if (role === 'admin' || role === 'member') {
            groups = allGroups.filter(g => g.id === groupId);
        }

        // For members, return a transparency view: they can see every member's
        // contribution STATUS (to build trust the group is active), but NOT other
        // members' bank details. Their own full records remain intact.
        if (role === 'member') {
            groups = groups.map(g => {
                const myMember = g.members.find(m => m.id === memberId);
                const sanitizedMembers = (g.members || []).map(m => {
                    if (m.id === memberId) return m; // own full record
                    // Strip private bank details for other members
                    const { bank, accountNumber, ...rest } = m;
                    return rest;
                });
                return {
                    ...g,
                    members: sanitizedMembers,
                    contributions: g.contributions || {},
                    payoutSchedule: (g.payoutSchedule || []).filter(s => s.memberId === memberId)
                };
            });
        }

        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const groups = await Group.find({});
        const group = groups.find(g => g.id === id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        const { role, groupId, memberId } = req.user || {};
        if (role === 'admin' && group.id !== groupId) {
            return res.status(403).json({ message: 'Admins can only access their own group' });
        }
        if (role === 'member') {
            if (group.id !== groupId) {
                return res.status(403).json({ message: 'Not authorized' });
            }
            const myMember = group.members.find(m => m.id === memberId);
            const sanitizedMembers = (group.members || []).map(m => {
                if (m.id === memberId) return m;
                const { bank, accountNumber, ...rest } = m;
                return rest;
            });
            return res.json({
                ...group,
                members: sanitizedMembers,
                contributions: group.contributions || {},
                payoutSchedule: (group.payoutSchedule || []).filter(s => s.memberId === memberId)
            });
        }
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const syncGroups = async (req, res) => {
    try {
        const groups = req.body;
        for (const g of groups) {
            await Group.findOneAndUpdate({ id: g.id }, g, { upsert: true, new: true });
        }
        res.json({ success: true, message: 'Groups synced successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
