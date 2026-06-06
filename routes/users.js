const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { requireAdmin } = require('../middleware/auth');

// All routes in this file require admin
router.use(requireAdmin);

/**
 * GET /api/users
 * List all users (admin only).
 */
router.get('/', async (req, res) => {
    try {
        const result = await db.execute(
            'SELECT id, username, display_name, email, role, company_name, created_at FROM users ORDER BY created_at ASC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('List users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * POST /api/users
 * Create a new user (admin only).
 * Body: { username, displayName, email, password, role }
 */
router.post('/', async (req, res) => {
    try {
        const { username, displayName, email, password, role } = req.body;

        if (!username || !password || !displayName) {
            return res.status(400).json({ error: 'Username, display name, and password are required' });
        }

        if (role && !['admin', 'user'].includes(role)) {
            return res.status(400).json({ error: 'Role must be "admin" or "user"' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = await db.execute({
            sql: 'INSERT INTO users (username, display_name, email, password_hash, role, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            args: [username, displayName, email || null, hash, role || 'user', req.user.id]
        });

        const userRes = await db.execute({
            sql: 'SELECT id, username, display_name, email, role, created_at FROM users WHERE id = ?',
            args: [result.lastInsertRowid.toString()]
        });

        res.status(201).json(userRes.rows[0]);
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        console.error('Create user error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * PATCH /api/users/:id
 * Update a user (admin only).
 * Body: { displayName?, email?, role?, password? }
 */
router.patch('/:id', async (req, res) => {
    try {
        const userRes = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.params.id] });
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const { displayName, email, role, password } = req.body;

        const queries = [];
        if (displayName) {
            queries.push({ sql: 'UPDATE users SET display_name = ? WHERE id = ?', args: [displayName, req.params.id] });
        }
        if (email !== undefined) {
            queries.push({ sql: 'UPDATE users SET email = ? WHERE id = ?', args: [email || null, req.params.id] });
        }
        if (role && ['admin', 'user'].includes(role)) {
            queries.push({ sql: 'UPDATE users SET role = ? WHERE id = ?', args: [role, req.params.id] });
        }
        if (password) {
            const hash = bcrypt.hashSync(password, 10);
            queries.push({ sql: 'UPDATE users SET password_hash = ? WHERE id = ?', args: [hash, req.params.id] });
        }

        if (queries.length > 0) {
            await db.batch(queries);
        }

        const updatedRes = await db.execute({
            sql: 'SELECT id, username, display_name, email, role, created_at FROM users WHERE id = ?',
            args: [req.params.id]
        });

        res.json(updatedRes.rows[0]);
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * DELETE /api/users/:id
 * Delete a user (admin only, cannot delete self).
 */
router.delete('/:id', async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const userRes = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.params.id] });
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        // Delete user's data first (cascading)
        await db.batch([
            { sql: 'DELETE FROM line_items WHERE bill_id IN (SELECT id FROM bills WHERE user_id = ?)', args: [req.params.id] },
            { sql: 'DELETE FROM bills WHERE user_id = ?', args: [req.params.id] },
            { sql: 'DELETE FROM clients WHERE user_id = ?', args: [req.params.id] },
            { sql: 'DELETE FROM bill_columns WHERE user_id = ?', args: [req.params.id] },
            { sql: 'DELETE FROM recipient_fields WHERE user_id = ?', args: [req.params.id] },
            { sql: 'DELETE FROM footer_fields WHERE user_id = ?', args: [req.params.id] },
            { sql: 'DELETE FROM users WHERE id = ?', args: [req.params.id] }
        ]);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
