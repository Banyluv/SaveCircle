import pool from '../config/db.js';
import { fileStore } from '../config/fileStore.js';

const useFileStore = () => process.env.STORAGE_MODE === 'file';

// Ensure the groups table exists (PostgreSQL mode only).
// The full group document (including nested members/contributions/payoutSchedule)
// is stored as JSONB so it round-trips exactly as the frontend expects.
export const initGroupsTable = async () => {
    if (useFileStore()) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            data JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
};

export const Group = {
    async find({}) {
        if (useFileStore()) {
            return await fileStore.find('groups');
        }
        const result = await pool.query('SELECT data FROM groups ORDER BY created_at ASC');
        return result.rows.map(r => r.data);
    },

    async findOneAndUpdate({ id }, update, { upsert = true } = {}) {
        if (useFileStore()) {
            const existing = await fileStore.findOne('groups', id, id);
            if (existing) {
                const data = { ...existing, ...update };
                await fileStore.upsert('groups', id, data);
                return data;
            } else if (upsert) {
                await fileStore.upsert('groups', id, update);
                return update;
            }
            return null;
        }
        const existing = await pool.query('SELECT data FROM groups WHERE id = $1', [id]);
        let data;
        if (existing.rows.length > 0) {
            data = { ...existing.rows[0].data, ...update };
        } else if (upsert) {
            data = update;
        } else {
            return null;
        }
        const result = await pool.query(
            `INSERT INTO groups (id, data, updated_at)
             VALUES ($1, $2::jsonb, NOW())
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
             RETURNING data`,
            [id, JSON.stringify(data)]
        );
        return result.rows[0].data;
    }
};

export default Group;
