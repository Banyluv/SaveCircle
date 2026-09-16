import pool from '../config/db.js';
import { fileStore } from '../config/fileStore.js';
import bcrypt from 'bcryptjs';

const useFileStore = () => process.env.STORAGE_MODE === 'file';

// Roles: superadmin (all groups), admin (one group), member (one group, own data)
// Loan-only borrower roles (no group required):
//   individual = a standalone person who borrows only
//   cooperative = an organisation/cooperative that borrows
// This mirrors the LoanApp account_type concept (individual|cooperative) but
// keeps SaveCircle's thrift roles separate.
export const ROLES = ['superadmin', 'admin', 'member', 'individual', 'cooperative'];

// Ensure the users table exists (PostgreSQL mode only)
export const initUsersTable = async () => {
    if (useFileStore()) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'member',
            group_id TEXT,
            member_id TEXT,
            bank_name TEXT,
            account_number TEXT,
            account_name TEXT,
            contribution_amount NUMERIC,
            withdraw_date DATE,
            withdrawal_status TEXT DEFAULT 'none',
            withdrawal_amount NUMERIC,
            withdrawal_fee NUMERIC DEFAULT 0,
            org_name TEXT,
            phone TEXT,
            address TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    // Migrate databases whose users table predates these columns
    // (CREATE TABLE IF NOT EXISTS does not alter existing tables).
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS group_id TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS member_id TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS account_name TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS contribution_amount NUMERIC`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS withdraw_date DATE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_status TEXT DEFAULT 'none'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_amount NUMERIC`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_fee NUMERIC DEFAULT 0`);
    // Loan-only borrower fields
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS org_name TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`);        // Which admin registered this borrower. Lets a group admin see only the
        // loan borrowers they created, rather than every borrower on the platform.
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER`);};

export const User = {
    async findOne(query) {
        if (useFileStore()) {
            const user = await fileStore.findWhere('users', (u) => {
                return Object.entries(query).every(([k, v]) => u[k] === v);
            });
            return user || null;
        }
        const where = [];
        const values = [];
        let i = 1;
        for (const [key, value] of Object.entries(query)) {
            if (value === undefined) continue;
            where.push(`${key} = $${i}`);
            values.push(value);
            i++;
        }
        if (where.length === 0) return null;
        const result = await pool.query(
            `SELECT * FROM users WHERE ${where.join(' AND ')} LIMIT 1`,
            values
        );
        return result.rows[0] || null;
    },

    async findById(id) {
        if (useFileStore()) {
            return await fileStore.findOne('users', id, id);
        }
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1 LIMIT 1',
            [id]
        );
        return result.rows[0] || null;
    },

    async find({}) {
        if (useFileStore()) {
            return await fileStore.find('users');
        }
        const result = await pool.query('SELECT * FROM users ORDER BY id ASC');
        return result.rows;
    },

    async create({ name, email, password, role = 'member', groupId, memberId, bankName, accountNumber, accountName, contributionAmount, orgName, phone, address, createdBy }) {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);
        if (useFileStore()) {
            const existing = await fileStore.findWhere('users', (u) => u.email === email);
            if (existing) return null;
            const users = await fileStore.find('users');
            const maxId = users.reduce((m, u) => Math.max(m, Number(u.id) || 0), 0);
            const user = {
                id: String(maxId + 1),
                name,
                email,
                password: hashed,
                role,
                groupId: groupId || null,
                memberId: memberId || null,
                bankName: bankName || null,
                accountNumber: accountNumber || null,
                accountName: accountName || null,
                contributionAmount: contributionAmount != null ? contributionAmount : null,
                withdrawalStatus: 'none',
                withdrawDate: null,
                withdrawalAmount: null,
                withdrawalFee: 0,
                orgName: orgName || null,
                phone: phone || null,
                address: address || null,
                createdBy: createdBy != null ? Number(createdBy) : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            await fileStore.upsert('users', user.id, user);
            return user;
        }
        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, group_id, member_id, bank_name, account_number, account_name, contribution_amount, org_name, phone, address, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             RETURNING *`,
            [name, email, hashed, role, groupId || null, memberId || null, bankName || null, accountNumber || null, accountName || null, contributionAmount != null ? contributionAmount : null, orgName || null, phone || null, address || null, createdBy != null ? Number(createdBy) : null]
        );
        return result.rows[0];
    },

    async update(id, updates) {
        if (useFileStore()) {
            const existing = await fileStore.findOne('users', id, id);
            if (!existing) return null;
            const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
            await fileStore.upsert('users', id, updated);
            return updated;
        }
        const cols = ['name', 'role', 'group_id', 'member_id', 'bank_name', 'account_number', 'account_name', 'contribution_amount', 'withdraw_date', 'withdrawal_status', 'withdrawal_amount', 'withdrawal_fee', 'org_name', 'phone', 'address'];
        const sets = [];
        const values = [];
        let i = 1;
        for (const c of cols) {
            if (updates[c] !== undefined) {
                sets.push(`${c} = $${i}`);
                values.push(updates[c] === null ? null : updates[c]);
                i++;
            }
        }
        if (sets.length === 0) return null;
        values.push(id);
        const result = await pool.query(
            `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    },

    async matchPassword(user, enteredPassword) {
        return await bcrypt.compare(enteredPassword, user.password);
    },

    async deleteOne({ email }) {
        if (useFileStore()) {
            const user = await fileStore.findWhere('users', (u) => u.email === email);
            if (!user) return 0;
            return (await fileStore.deleteOne('users', user.id)) ? 1 : 0;
        }
        const result = await pool.query('DELETE FROM users WHERE email = $1', [email]);
        return result.rowCount;
    }
};

export default User;
