import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
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

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve the built frontend (from <projectRoot>/dist) when present, so the same
// server can be used for hosted/online access. API routes above take priority.
const distDir = path.resolve(__dirname, '..', 'dist');
const hasDist = fs.existsSync(distDir);

if (hasDist) {
    app.use(express.static(distDir));
    // SPA fallback for the built app
    app.get(/^\/(?!api\/).*/, (req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
    });
}

// Root health/API info message (only when the built frontend is absent)
app.get('/', (req, res) => {
    res.send('SaveCircle API is running...');
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
