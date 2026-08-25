import pg from 'pg';

const { Pool } = pg;

const useFileStore = () => process.env.STORAGE_MODE === 'file';

// PostgreSQL connection pool.
// Uses DATABASE_URL if provided, otherwise falls back to local defaults.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://savecircle_user:savecircle_pass_2026@127.0.0.1:5432/savecircle',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

export const connectDB = async () => {
    // In file-storage mode (offline desktop), no external DB service is needed.
    if (useFileStore()) {
        console.log('Using file-based storage (offline desktop mode)');
        return null;
    }
    try {
        const client = await pool.connect();
        console.log(`PostgreSQL Connected: ${client.host}:${client.port}/${client.database}`);
        client.release();
    } catch (error) {
        console.error(`Error connecting to PostgreSQL: ${error.message}`);
        process.exit(1);
    }
};

export default pool;
