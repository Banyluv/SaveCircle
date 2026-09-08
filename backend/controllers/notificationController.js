import Notification from '../models/Notification.js';
import pool from '../config/db.js';
import { fileStore } from '../config/fileStore.js';

const useFileStore = () => process.env.STORAGE_MODE === 'file';

// Guard: notifications require PostgreSQL (they are DB-native).
const requireDb = (req, res) => {
    if (useFileStore()) {
        res.status(503).json({ success: false, message: 'Notifications are only available in online/server mode (PostgreSQL).' });
        return false;
    }
    return true;
};

// GET /api/notifications — list the current user's notifications + unread count
export const getNotifications = async (req, res) => {
    if (!requireDb(req, res)) return;
    try {
        const data = await Notification.listForUser(req.user.id, { limit: 40 });
        res.json({ success: true, data });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

// GET /api/notifications/unread-count — lightweight unread badge count
export const getUnreadCount = async (req, res) => {
    if (!requireDb(req, res)) return;
    try {
        const data = await Notification.listForUser(req.user.id, { limit: 1 });
        res.json({ success: true, data: { unread_count: data.unread_count } });
    } catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({ success: false, message: 'Failed' });
    }
};

// PATCH /api/notifications/read-all — mark all of the user's notifications read
export const markAllRead = async (req, res) => {
    if (!requireDb(req, res)) return;
    try {
        await Notification.markAllRead(req.user.id);
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ success: false, message: 'Failed' });
    }
};

// PATCH /api/notifications/:id/read — mark a single notification read
export const markOneRead = async (req, res) => {
    if (!requireDb(req, res)) return;
    try {
        const { id } = req.params;
        await Notification.markOneRead(id, req.user.id);
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ success: false, message: 'Failed' });
    }
};

// ─── Notification emitter helpers (used by loan controller) ─────────────────
// Notify the borrower that their loan application was received/approved/rejected.
export const notifyBorrower = async ({ userId, type, title, message, link }) => {
    try {
        await Notification.createForUser({ userId, type, title, message, link });
    } catch (e) {
        console.error('notifyBorrower error:', e);
    }
};

// Notify all admins/superadmins about a new application / repayment etc.
export const notifyAdmins = async ({ type, title, message, link, excludeUserId = null }) => {
    try {
        const admins = await pool.query(
            `SELECT id FROM users WHERE role IN ('admin','superadmin')`
        );
        const ids = admins.rows
            .map((r) => r.id)
            .filter((id) => Number(id) !== Number(excludeUserId));
        await Notification.createForUsers({ userIds: ids, type, title, message, link });
    } catch (e) {
        console.error('notifyAdmins error:', e);
    }
};
