import pool from '../config/db.js';
import { fileStore } from '../config/fileStore.js';

const useFileStore = () => process.env.STORAGE_MODE === 'file';

// Ensure the logs table exists (PostgreSQL mode only).
export const initLogsTable = async () => {
    if (useFileStore()) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS logs (
            id TEXT PRIMARY KEY,
            data JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
};

export const Log = {
    async find({}) {
        if (useFileStore()) {
            return await fileStore.find('logs');
        }
        const result = await pool.query('SELECT data FROM logs ORDER BY created_at ASC');
        return result.rows.map(r => r.data);
    },

    async findOneAndUpdate({ id }, update, { upsert = true } = {}) {
        if (useFileStore()) {
            const existing = await fileStore.findOne('logs', id, id);
            if (existing) {
                const data = { ...existing, ...update };
                await fileStore.upsert('logs', id, data);
                return data;
            } else if (upsert) {
                await fileStore.upsert('logs', id, update);
                return update;
            }
            return null;
        }
        const existing = await pool.query('SELECT data FROM logs WHERE id = $1', [id]);
        let data;
        if (existing.rows.length > 0) {
            data = { ...existing.rows[0].data, ...update };
        } else if (upsert) {
            data = update;
        } else {
            return null;
        }
        const result = await pool.query(
            `INSERT INTO logs (id, data)
             VALUES ($1, $2::jsonb)
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
             RETURNING data`,
            [id, JSON.stringify(data)]
        );
        return result.rows[0].data;
    }
};

export default Log;
