import pool from '../config/db.js';
import { fileStore } from '../config/fileStore.js';

const useFileStore = () => process.env.STORAGE_MODE === 'file';

// Simple key → JSONB settings store. Used for platform-wide configuration such
// as the central account all contributions are paid into.
export const initSettingsTable = async () => {
    if (useFileStore()) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
};

export const Settings = {
    async get(key) {
        if (useFileStore()) {
            const row = await fileStore.findOne('settings', key, key);
            return row ? (row.data ?? row) : null;
        }
        const res = await pool.query('SELECT data FROM settings WHERE key = $1', [key]);
        return res.rows.length ? res.rows[0].data : null;
    },

    async set(key, value) {
        if (useFileStore()) {
            await fileStore.upsert('settings', key, { key, data: value });
            return value;
        }
        const res = await pool.query(
            `INSERT INTO settings (key, data, updated_at)
             VALUES ($1, $2::jsonb, NOW())
             ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
             RETURNING data`,
            [key, JSON.stringify(value)]
        );
        return res.rows[0].data;
    }
};

export const CENTRAL_ACCOUNT_KEY = 'central_account';

export default Settings;
