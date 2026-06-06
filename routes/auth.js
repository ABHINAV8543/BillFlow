const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/connection');

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const result = await db.execute({
            sql: 'SELECT * FROM users WHERE username = ?',
            args: [username]
        });
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Create session
        req.session.userId = user.id;
        res.json({
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            email: user.email,
            role: user.role
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
    req.session = null;
    res.clearCookie('session');
    res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Returns the current authenticated user or 401.
 */
router.get('/me', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const result = await db.execute({
            sql: 'SELECT id, username, display_name, email, role FROM users WHERE id = ?',
            args: [req.session.userId]
        });
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error('Auth check error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
