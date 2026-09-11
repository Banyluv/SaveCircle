import pg from 'pg';

const { Pool } = pg;

const useFileStore = () => process.env.STORAGE_MODE === 'file';

// PostgreSQL connection pool.
// Uses DATABASE_URL if provided, otherwise falls back to local defaults.
const connectionString = process.env.DATABASE_URL
    || 'postgres://savecircle_user:savecircle_pass_2026@127.0.0.1:5432/savecircle';

// Hosted providers (Neon, Supabase, Render, ...) require TLS. Detect it from the
// connection string so no extra env var is needed, but allow an explicit override
// with DATABASE_SSL=true|false.
const wantsSsl = () => {
    if (process.env.DATABASE_SSL === 'true') return true;
    if (process.env.DATABASE_SSL === 'false') return false;
    if (/[?&]sslmode=(require|verify-ca|verify-full)/i.test(connectionString)) return true;
    try {
        const { hostname } = new URL(connectionString);
        return !['localhost', '127.0.0.1', '::1'].includes(hostname);
    } catch {
        return false;
    }
};

const pool = new Pool({
    connectionString,
    ssl: wantsSsl() ? { rejectUnauthorized: false } : false
});

export const connectDB = async () => {
    // In file-storage mode (offline desktop), no external DB service is needed.
    if (useFileStore()) {
        console.log('Using file-based storage (offline desktop mode)');
        return null;
    }
    if (!process.env.DATABASE_URL) {
        console.error(
            'DATABASE_URL is not set.\n' +
            '  Hosted deployments (Render, Railway, ...) must provide DATABASE_URL\n' +
            '  as an environment variable. The built-in fallback points at a local\n' +
            '  PostgreSQL instance, which does not exist in a container.'
        );
    }
    try {
        const client = await pool.connect();
        console.log(`PostgreSQL Connected: ${client.host}:${client.port}/${client.database}`);
        client.release();
    } catch (error) {
        console.error(`Error connecting to PostgreSQL: ${error.message}`);
        console.error(`  Host: ${pool.options.host || '(from DATABASE_URL)'}`);
        console.error('  Check that DATABASE_URL is set, reachable from this host, and');
        console.error('  that the database allows external/SSL connections.');
        process.exit(1);
    }
};

export default pool;
