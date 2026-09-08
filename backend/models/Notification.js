import pool from '../config/db.js';
import { fileStore } from '../config/fileStore.js';

const useFileStore = () => process.env.STORAGE_MODE === 'file';

// Notifications for SaveCircle (loan approvals → borrower, new applications →
// admin, etc.). Stores one row per recipient. Borrowers/members/admins all use
// the same notifications table keyed off users.id.
export const initNotificationsTable = async () => {
    if (useFileStore()) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL DEFAULT 'general'
                CHECK (type IN ('loan_applied','loan_approved','loan_rejected','loan_disbursed','repayment_submitted','repayment_verified','general')),
            title TEXT NOT NULL,
            message TEXT,
            link TEXT,
            is_read BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)');
};

export const Notification = {
    // Create a notification for one user.
    async createForUser({ userId, type = 'general', title, message = null, link = null }) {
        if (useFileStore()) return null;
        const result = await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, type, title, message, link]
        );
        return result.rows[0];
    },

    // Create notifications for many users at once.
    async createForUsers({ userIds, type = 'general', title, message = null, link = null }) {
        if (useFileStore()) return [];
        const created = [];
        for (const uid of userIds) {
            if (uid == null) continue;
            const r = await this.createForUser({ userId: uid, type, title, message, link });
            if (r) created.push(r);
        }
        return created;
    },

    // List notifications for a user, newest first, with unread count.
    async listForUser(userId, { limit = 30 } = {}) {
        if (useFileStore()) return { notifications: [], unread_count: 0 };
        const result = await pool.query(
            `SELECT * FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [userId, limit]
        );
        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        return {
            notifications: result.rows,
            unread_count: countResult.rows[0]?.count || 0,
        };
    },

    async markAllRead(userId) {
        if (useFileStore()) return;
        await pool.query(
            `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
    },

    async markOneRead(notificationId, userId) {
        if (useFileStore()) return;
        await pool.query(
            `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
            [notificationId, userId]
        );
    },
};

export default Notification;
