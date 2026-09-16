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
import settingRoutes from './routes/settingRoutes.js';
import User from './models/User.js';
import { initUsersTable } from './models/User.js';
import { initGroupsTable } from './models/Group.js';
import { initLogsTable } from './models/Log.js';
import { initLoansTable } from './models/Loan.js';
import { initNotificationsTable } from './models/Notification.js';
import { initSettingsTable } from './models/Setting.js';
import { Settings, CENTRAL_ACCOUNT_KEY } from './models/Setting.js';
import { getRelease, LOCAL_APK_PATH } from './config/appRelease.js';

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
app.use('/api/settings', settingRoutes);

// Seed the central payment account. It intentionally starts empty/inactive: a
// superadmin activates it once the real bank details are known, so members are
// never shown a placeholder account number to pay into.
const seedCentralAccount = async () => {
    try {
        const existing = await Settings.get(CENTRAL_ACCOUNT_KEY);
        if (!existing) {
            await Settings.set(CENTRAL_ACCOUNT_KEY, {
                bankName: '',
                accountNumber: '',
                accountName: '',
                note: 'Set the platform central account in Admins → Central Account.',
                active: false
            });
            console.log('Central account initialised (inactive — superadmin must configure it)');
        }
    } catch (error) {
        console.error('Error seeding central account:', error.message);
    }
};

// Lightweight health endpoint. Render's health check should point here rather
// than at "/", so it does not depend on whether the frontend bundle exists.
const distDir = path.resolve(__dirname, '..', 'dist');
const hasDist = fs.existsSync(distDir);

app.get('/api/health', async (req, res) => {
    const release = getRelease();
    const payload = {
        status: 'ok',
        uptime: Math.round(process.uptime()),
        database: process.env.STORAGE_MODE === 'file' ? 'file' : 'postgres',
        frontend: hasDist ? 'served' : 'missing',
        appVersion: release.versionName,
        appVersionCode: release.versionCode
    };

    if (payload.database === 'file') {
        payload.database_status = 'n/a';
        return res.json(payload);
    }

    // Report DB reachability, but retry once first: serverless Postgres (Neon)
    // suspends when idle and needs a moment to resume. A single failed probe
    // must not report the service unhealthy, or a deploy could be rolled back
    // over a routine cold start.
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            await pool.query('SELECT 1');
            payload.database_status = 'connected';
            return res.json(payload);
        } catch (error) {
            if (attempt === 1) {
                payload.status = 'degraded';
                payload.database_status = 'unreachable';
                payload.database_error = error.message;
                return res.status(503).json(payload);
            }
            await new Promise((r) => setTimeout(r, 750));
        }
    }
});

// ─── App release / over-the-air update ───────────────────────────────────────
// The installed Android app polls this to find out whether a newer APK exists.
// Deliberately public (no auth): a user who cannot sign in — e.g. because the
// server address changed — must still be able to update the app.
//
// `currentVersionCode` is what the phone reports about ITSELF; the server only
// compares numbers. Omitting it returns the latest version without a verdict,
// which is what the web UI uses to display "latest version".
app.get('/api/app/version', (req, res) => {
    const release = getRelease();
    const apkUrl = /^https?:\/\//i.test(release.apkPath)
        ? release.apkPath
        : `${req.protocol}://${req.get('host')}${release.apkPath}`;

    const payload = {
        latestVersionCode: release.versionCode,
        latestVersionName: release.versionName,
        apkUrl,
        // False when no binary exists for this deployment (e.g. a hosted server
        // without APK_URL set, since apk/ is gitignored). The client hides the
        // download button rather than offering one that 404s.
        apkAvailable: release.apkAvailable,
        sha256: release.sha256,
        notes: release.notes,
        releasedAt: release.releasedAt
    };

    const clientRaw = req.query.currentVersionCode;
    if (clientRaw === undefined || clientRaw === '') {
        return res.json({ ...payload, updateAvailable: null });
    }

    const clientCode = Number.parseInt(clientRaw, 10);
    if (!Number.isFinite(clientCode)) {
        return res.status(400).json({ message: 'currentVersionCode must be an integer' });
    }

    payload.currentVersionCode = clientCode;
    payload.updateAvailable = release.versionCode > clientCode || release.forceUpdate;
    res.json(payload);
});

// ─── Android APK delivery ────────────────────────────────────────────────────
// Kept OUTSIDE the `if (hasDist)` block: downloading/updating the app must not
// depend on whether this process also happens to be serving the web bundle.
//
// The APK is kept in <projectRoot>/apk — NOT in public/ — because Vite copies
// public/ into dist/ and Capacitor then embeds dist/ inside the APK itself,
// making every build ship a copy of the PREVIOUS APK (the file doubled in size
// each rebuild).
//
// On a hosted deployment the binary is normally absent (apk/ is gitignored), so
// set APK_URL to a release URL; this route then simply redirects there instead
// of 404ing.
app.get('/downloads/savecircle.apk', (req, res) => {
    const release = getRelease();

    if (/^https?:\/\//i.test(release.apkPath)) {
        return res.redirect(302, release.apkPath);
    }

    if (!fs.existsSync(LOCAL_APK_PATH)) {
        return res.status(404).json({
            message: 'The Android APK is not available on this server yet.',
            hint: 'Build it with: npm run android:apk, or set APK_URL to a hosted release.'
        });
    }

    const stat = fs.statSync(LOCAL_APK_PATH);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="SaveCircle.apk"');
    res.setHeader('Content-Length', stat.size);
    // Never cache: an update must always fetch the current binary, or phones get
    // stuck reinstalling the same stale build.
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(LOCAL_APK_PATH);
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
    await initSettingsTable();

    const server = await new Promise((resolve) => {
        const s = app.listen(port, host, () => {
            console.log(`Server running on http://${host}:${port}`);
            seedUsers();
            seedCentralAccount();
            resolve(s);
        });
    });

    return server;
};

export default app;
