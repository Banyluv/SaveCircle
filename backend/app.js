import './config/env.js'; // must come first: loads backend/.env into process.env
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import pool from './config/db.js';
import groupRoutes from './routes/groupRoutes.js';
import logRoutes from './routes/logRoutes.js';
import authRoutes from './routes/authRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import User from './models/User.js';
import { initUsersTable } from './models/User.js';
import { initGroupsTable } from './models/Group.js';
import { initLogsTable } from './models/Log.js';
import { initLoansTable } from './models/Loan.js';
import { initNotificationsTable } from './models/Notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env by absolute path so the server works no matter which
// directory it is launched from.
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Hosted platforms (Render, Railway, Fly, Heroku, ...) terminate TLS at a proxy
// and forward the client IP in X-Forwarded-*. Trusting the first proxy hop lets
// Express report the real client IP / protocol.
app.set('trust proxy', 1);
// Do not advertise the framework version.
app.disable('x-powered-by');

// Baseline security headers (no extra dependency required).
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// CORS: the built frontend is served by this same server, so cross-origin
// requests are not required. Set CORS_ORIGIN to a comma-separated allowlist to
// permit specific external origins; unset keeps the permissive default so the
// desktop shell and local dev server keep working.
const corsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/notifications', notificationRoutes);

// Lightweight health endpoint. Render's health check should point here rather
// than at "/", so it does not depend on whether the frontend bundle exists.
const distDir = path.resolve(__dirname, '..', 'dist');
const hasDist = fs.existsSync(distDir);

app.get('/api/health', async (req, res) => {
    const payload = {
        status: 'ok',
        uptime: Math.round(process.uptime()),
        database: process.env.STORAGE_MODE === 'file' ? 'file' : 'postgres',
        frontend: hasDist ? 'served' : 'missing'
    };
    // Report DB reachability so a broken database surfaces as an unhealthy
    // deploy instead of a service that accepts traffic and then 500s.
    if (payload.database === 'postgres') {
        try {
            await pool.query('SELECT 1');
            payload.database_status = 'connected';
        } catch (error) {
            payload.status = 'degraded';
            payload.database_status = 'unreachable';
            return res.status(503).json(payload);
        }
    } else {
        payload.database_status = 'n/a';
    }
    res.json(payload);
});

// Serve the built frontend (from <projectRoot>/dist) when present, so the same
// server can be used for hosted/online access. API routes above take priority.
if (hasDist) {
    // Fingerprinted assets in /assets are safe to cache aggressively; the HTML
    // entry point must not be cached or users get stuck on a stale bundle.
    app.use(express.static(distDir, {
        index: false,
        setHeaders: (res, filePath) => {
            if (filePath.includes(`${path.sep}assets${path.sep}`)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            } else {
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }));
    // SPA fallback for the built app
    app.get(/^\/(?!api\/).*/, (req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
    });
} else {
    // No build present (e.g. API-only run): make it obvious rather than 404ing
    // at "/" with a confusing Express default page.
    app.get('/', (req, res) => {
        res.send('SaveCircle API is running... (no frontend build found in dist/)');
    });
}

// Unknown API route → JSON 404 instead of the HTML SPA fallback, so API clients
// always get a parseable response.
app.use('/api', (req, res) => {
    res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler: keeps the process alive and returns JSON instead of a
// stack trace when something throws inside a route.
app.use((err, req, res, next) => {
    console.error('Unhandled request error:', err);
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Seed default users: superadmin, group admins, and member accounts.
const seedUsers = async () => {
    const seeds = [
        { name: 'Super Admin', email: 'superadmin@savecircle.com', password: 'superadmin123', role: 'superadmin', groupId: null, memberId: null },
        // Group 1 admin
        { name: 'Mama Blessing Edet', email: 'admin1@savecircle.com', password: 'admin123', role: 'admin', groupId: 'group-1', memberId: 'm1' },
        // Group 2 admin
        { name: 'Madam Veronica Akpan', email: 'admin2@savecircle.com', password: 'admin123', role: 'admin', groupId: 'group-2', memberId: 'm201' },
        // Group 3 admin
        { name: 'Engr. Daniel Kufre', email: 'admin3@savecircle.com', password: 'admin123', role: 'admin', groupId: 'group-3', memberId: 'm301' },
        // Group 4 admin
        { name: 'Alhaja Kudirat Folami', email: 'admin4@savecircle.com', password: 'admin123', role: 'admin', groupId: 'group-4', memberId: 'm401' },
        // Sample members in group 1
        { name: 'Effiong Bassey', email: 'member1@savecircle.com', password: 'member123', role: 'member', groupId: 'group-1', memberId: 'm2' },
        { name: 'Ekaette Okon', email: 'member2@savecircle.com', password: 'member123', role: 'member', groupId: 'group-1', memberId: 'm3' }
    ];
    try {
        for (const s of seeds) {
            const exists = await User.findOne({ email: s.email });
            if (!exists) {
                await User.create(s);
                console.log(`User created: ${s.email} (${s.role})`);
            }
        }
    } catch (error) {
        console.error('Error seeding users:', error);
    }
};

/**
 * Initialise the database and start the HTTP server.
 * Returns a promise resolving to the running server instance.
 * - host default: 127.0.0.1 (localhost, used by the desktop app).
 * - Set HOST=0.0.0.0 to allow other users to access it over the network/internet.
 */
export const startServer = async (port = process.env.PORT || 5000, host = process.env.HOST || '127.0.0.1') => {
    await connectDB();
    await initUsersTable();
    await initGroupsTable();
    await initLogsTable();
    await initLoansTable();
    await initNotificationsTable();

    const server = await new Promise((resolve) => {
        const s = app.listen(port, host, () => {
            console.log(`Server running on http://${host}:${port}`);
            seedUsers();
            resolve(s);
        });
    });

    return server;
};

export default app;
