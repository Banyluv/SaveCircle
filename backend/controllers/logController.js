import Log from '../models/Log.js';

// Group admins must only ever see activity for their own group. Group documents
// carry the group's display name, but audit entries only store `groupName`, so
// we resolve the caller's group name from the groups table for the filter.
const groupNameForUser = async (user) => {
    if (!user || !user.groupId) return null;
    try {
        const Group = (await import('../models/Group.js')).default;
        const groups = await Group.find({});
        const mine = groups.find(g => g.id === user.groupId);
        return mine ? mine.name : null;
    } catch {
        return null;
    }
};

export const getLogs = async (req, res) => {
    try {
        // Sort by timestamp descending (newest first)
        const logs = await Log.find({});
        logs.sort((a, b) => {
            const ta = new Date(a.timestamp || 0);
            const tb = new Date(b.timestamp || 0);
            return tb - ta;
        });

        const { role, groupId } = req.user || {};

        // superadmin: full audit trail.
        // admin: only entries belonging to their own group.
        // member: only entries for their own group (read-only transparency).
        if (role === 'superadmin') {
            return res.json(logs);
        }

        if ((role === 'admin' || role === 'member') && groupId) {
            const myGroupName = await groupNameForUser(req.user);
            if (!myGroupName) return res.json([]);
            const scoped = logs.filter(l => l.groupName === myGroupName);
            return res.json(scoped);
        }

        // Loan-only borrowers have no group context.
        res.json([]);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const syncLogs = async (req, res) => {
    try {
        const logs = req.body;
        if (!Array.isArray(logs)) {
            return res.status(400).json({ message: 'Expected an array of logs' });
        }

        const { role, groupId } = req.user || {};

        // A group admin may only write audit entries for their own group;
        // otherwise they could forge entries in another group's history.
        if (role !== 'superadmin') {
            const myGroupName = await groupNameForUser(req.user);
            if (!myGroupName) {
                return res.status(403).json({ message: 'Not authorized to write audit logs' });
            }
            const foreign = logs.filter(l => l.groupName !== myGroupName);
            if (foreign.length) {
                return res.status(403).json({ message: 'Admins can only write audit logs for their own group' });
            }
        }

        for (const log of logs) {
            const id = log?.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            await Log.findOneAndUpdate({ id }, { ...log, id }, { upsert: true, new: true });
        }
        res.json({ success: true, message: 'Logs synced successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
